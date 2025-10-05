# backend/app/api/routers/admin/database.py
"""Database query interface"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ._deps import limiter, get_client_info
from ...deps_auth import get_admin_user, get_admin_user_with_step_up
from ....db.session import get_db
from ....db import models
from ....domain.admin.database_service import DatabaseAdminService


router = APIRouter(tags=["admin-database"])

# Emergency SQL query tool for production debugging
# Read-only queries with comprehensive safety checks

class DatabaseQueryRequest(BaseModel):
    query: str = Field(..., description="SQL query to execute (SELECT only)")
    justification: str = Field(..., min_length=10, description="Reason for executing this query")


class DatabaseQueryResponse(BaseModel):
    columns: list[str]
    rows: list[dict]
    row_count: int
    execution_time_ms: float
    query: str


class TableColumn(BaseModel):
    column_name: str
    data_type: str
    is_nullable: bool
    column_default: Optional[str]
    max_length: Optional[int]


class TableInfoResponse(BaseModel):
    table_name: str
    row_count: int
    size_bytes: Optional[int]
    columns: list[TableColumn]


@router.post(
    "/database/query",
    response_model=DatabaseQueryResponse,
    summary="Execute SQL Query"
)
@limiter.limit("10/minute")  # Very strict limit for database queries
async def execute_database_query(
    request: Request,
    query_request: DatabaseQueryRequest,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user_with_step_up)
):
    """
    Execute read-only SQL query for debugging
    
    - Requires step-up authentication (recent password confirmation)
    - Only SELECT and WITH queries allowed
    - Comprehensive safety validation
    - Automatic audit logging
    - Query timing metrics
    """
    service = DatabaseAdminService(db)
    
    result = await service.execute_query(
        query=query_request.query,
        admin_id=current_admin.id,
        justification=query_request.justification
    )
    
    return DatabaseQueryResponse(
        columns=result.columns,
        rows=result.rows,
        row_count=result.row_count,
        execution_time_ms=result.execution_time_ms,
        query=result.query
    )


@router.get(
    "/database/tables",
    response_model=list[TableInfoResponse],
    summary="List Database Tables"
)
@limiter.limit("20/minute")
async def list_database_tables(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    List all database tables with row counts and column info
    
    Returns schema information for all tables in public schema
    """
    service = DatabaseAdminService(db)
    tables = await service.list_tables()
    
    return [
        TableInfoResponse(
            table_name=table.table_name,
            row_count=table.row_count,
            size_bytes=table.size_bytes,
            columns=[
                TableColumn(
                    column_name=col["column_name"],
                    data_type=col["data_type"],
                    is_nullable=col["is_nullable"],
                    column_default=col.get("column_default"),
                    max_length=col.get("max_length")
                )
                for col in table.columns
            ]
        )
        for table in tables
    ]


@router.get(
    "/database/schema/{table_name}",
    response_model=TableInfoResponse,
    summary="Get Table Schema"
)
@limiter.limit("30/minute")
async def get_table_schema(
    request: Request,
    table_name: str,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_admin_user)
):
    """
    Get detailed schema for specific table
    
    Returns columns with types, nullable status, defaults, and constraints
    """
    service = DatabaseAdminService(db)
    table_info = await service.get_table_schema(table_name)
    
    return TableInfoResponse(
        table_name=table_info.table_name,
        row_count=table_info.row_count,
        size_bytes=table_info.size_bytes,
        columns=[
            TableColumn(
                column_name=col["column_name"],
                data_type=col["data_type"],
                is_nullable=col["is_nullable"],
                column_default=col.get("column_default"),
                max_length=col.get("max_length")
            )
            for col in table_info.columns
        ]
    )

