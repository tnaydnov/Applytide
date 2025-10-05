# backend/app/domain/admin/database_dto.py
"""Data transfer objects for admin database query interface"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Any


@dataclass
class QueryResultDTO:
    """Results from a database query"""
    columns: list[str]
    rows: list[list[Any]]
    row_count: int
    execution_time_ms: float
    query: str


@dataclass
class TableInfoDTO:
    """Information about a database table"""
    table_name: str
    row_count: int
    size_bytes: Optional[int]
    columns: list[dict]  # [{"name": "id", "type": "uuid", "nullable": false}]


@dataclass
class DatabaseStatsDTO:
    """Overall database statistics"""
    total_tables: int
    total_rows: int
    database_size_bytes: int
    tables: list[TableInfoDTO]
