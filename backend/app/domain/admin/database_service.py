# backend/app/domain/admin/database_service.py
"""Business logic for admin database query interface"""
import re
import time
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .database_dto import QueryResultDTO, TableInfoDTO, DatabaseStatsDTO
from .service import AdminService


class DatabaseAdminService:
    """Handles business logic for admin database operations"""
    
    # Allowed SQL keywords for read-only queries
    ALLOWED_KEYWORDS = {
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
        'ON', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET', 'AS', 'AND', 'OR',
        'IN', 'NOT', 'LIKE', 'ILIKE', 'BETWEEN', 'IS', 'NULL', 'COUNT',
        'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'CASE', 'WHEN', 'THEN',
        'ELSE', 'END', 'CAST', 'COALESCE', 'NULLIF', 'HAVING', 'EXISTS',
        'UNION', 'INTERSECT', 'EXCEPT', 'WITH', 'RECURSIVE'
    }
    
    # Dangerous keywords that should never appear
    DANGEROUS_KEYWORDS = {
        'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE',
        'GRANT', 'REVOKE', 'EXECUTE', 'EXEC', 'CALL', 'MERGE', 'REPLACE',
        'RENAME', 'COMMENT', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'LOCK',
        'UNLOCK', 'SET', 'DECLARE', 'BEGIN', 'END', 'PROCEDURE', 'FUNCTION',
        'TRIGGER', 'VIEW', 'INDEX', 'CONSTRAINT', 'FOREIGN', 'PRIMARY',
        'REFERENCES', 'CHECK', 'DEFAULT', 'UNIQUE', 'KEY'
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.admin_service = AdminService(db)
    
    def _is_safe_query(self, query: str) -> tuple[bool, Optional[str]]:
        """Check if a query is safe to execute (read-only)"""
        # Normalize query
        normalized = query.upper().strip()
        
        # Remove comments
        normalized = re.sub(r'--.*?$', '', normalized, flags=re.MULTILINE)
        normalized = re.sub(r'/\*.*?\*/', '', normalized, flags=re.DOTALL)
        
        # Check for dangerous keywords
        for keyword in self.DANGEROUS_KEYWORDS:
            if re.search(r'\b' + keyword + r'\b', normalized):
                return False, f"Forbidden keyword detected: {keyword}"
        
        # Must start with SELECT or WITH (for CTEs)
        if not (normalized.startswith('SELECT') or normalized.startswith('WITH')):
            return False, "Query must start with SELECT or WITH"
        
        # Check for semicolons (multiple statements)
        if ';' in query.rstrip(';'):
            return False, "Multiple statements not allowed"
        
        return True, None
    
    async def execute_query(
        self,
        query: str,
        admin_id: UUID,
        justification: str
    ) -> QueryResultDTO:
        """Execute a read-only SQL query"""
        # Validate query safety
        is_safe, error_msg = self._is_safe_query(query)
        if not is_safe:
            raise ValueError(f"Unsafe query: {error_msg}")
        
        # Execute query with timing
        start_time = time.time()
        
        try:
            result = await self.db.execute(text(query))
            rows = result.fetchall()
            
            # Get column names
            columns = list(result.keys()) if result.keys() else []
            
            # Convert rows to list of lists
            row_data = [list(row) for row in rows]
            
            execution_time_ms = (time.time() - start_time) * 1000
            
            # Log the query execution
            await self.admin_service.log_action(
                admin_id=admin_id,
                action="execute_database_query",
                target_type="database",
                target_id=None,
                justification=justification,
                metadata={
                    "query": query[:500],  # Truncate long queries
                    "row_count": len(rows),
                    "execution_time_ms": round(execution_time_ms, 2)
                }
            )
            
            return QueryResultDTO(
                columns=columns,
                rows=row_data,
                row_count=len(rows),
                execution_time_ms=round(execution_time_ms, 2),
                query=query
            )
            
        except Exception as e:
            # Log failed query
            await self.admin_service.log_action(
                admin_id=admin_id,
                action="execute_database_query_failed",
                target_type="database",
                target_id=None,
                justification=justification,
                metadata={
                    "query": query[:500],
                    "error": str(e)
                }
            )
            raise ValueError(f"Query execution failed: {str(e)}")
    
    async def list_tables(self) -> list[TableInfoDTO]:
        """Get list of all tables with row counts"""
        # Query to get all table names
        table_query = text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        
        result = await self.db.execute(table_query)
        table_names = [row[0] for row in result.fetchall()]
        
        tables = []
        for table_name in table_names:
            # Get row count
            count_query = text(f'SELECT COUNT(*) FROM "{table_name}"')
            count_result = await self.db.execute(count_query)
            row_count = count_result.scalar() or 0
            
            # Get column info
            columns_query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = :table_name
                ORDER BY ordinal_position
            """)
            columns_result = await self.db.execute(columns_query, {"table_name": table_name})
            columns = [
                {
                    "name": row[0],
                    "type": row[1],
                    "nullable": row[2] == 'YES'
                }
                for row in columns_result.fetchall()
            ]
            
            tables.append(TableInfoDTO(
                table_name=table_name,
                row_count=row_count,
                size_bytes=None,  # Would require pg_total_relation_size
                columns=columns
            ))
        
        return tables
    
    async def get_table_schema(self, table_name: str) -> Optional[TableInfoDTO]:
        """Get detailed schema for a specific table"""
        # Validate table name (prevent SQL injection)
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table_name):
            raise ValueError("Invalid table name")
        
        # Check if table exists
        check_query = text("""
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name = :table_name
        """)
        result = await self.db.execute(check_query, {"table_name": table_name})
        if result.scalar() == 0:
            return None
        
        # Get row count
        count_query = text(f'SELECT COUNT(*) FROM "{table_name}"')
        count_result = await self.db.execute(count_query)
        row_count = count_result.scalar() or 0
        
        # Get column info
        columns_query = text("""
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = :table_name
            ORDER BY ordinal_position
        """)
        columns_result = await self.db.execute(columns_query, {"table_name": table_name})
        columns = [
            {
                "name": row[0],
                "type": row[1],
                "nullable": row[2] == 'YES',
                "default": row[3],
                "max_length": row[4]
            }
            for row in columns_result.fetchall()
        ]
        
        return TableInfoDTO(
            table_name=table_name,
            row_count=row_count,
            size_bytes=None,
            columns=columns
        )
