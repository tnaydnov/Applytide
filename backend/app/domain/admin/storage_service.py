# backend/app/domain/admin/storage_service.py
import os
from pathlib import Path
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from .storage_dto import StorageStatsDTO, UserStorageDTO, OrphanedFileDTO
from .service import AdminService
from ...db import models
from ...config import settings


class StorageAdminService:
    """
    Admin service for storage management and analysis
    
    Analyzes disk usage, tracks storage by user, finds orphaned files
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        # Get upload directory from config or use default
        self.upload_dir = getattr(settings, 'UPLOAD_DIR', 'backend/app/uploads')
        
    async def get_storage_stats(self) -> StorageStatsDTO:
        """
        Get comprehensive storage statistics
        
        Returns:
            Overall storage metrics including orphaned files
        """
        # Get document statistics from database
        result = await self.db.execute(
            select(
                func.count(models.Document.id).label('total_docs'),
                func.sum(func.length(models.Document.file_path)).label('path_length_sum'),
                func.max(func.length(models.Document.file_path)).label('max_path_length')
            )
        )
        db_stats = result.first()
        
        # Scan actual files on disk
        total_storage_bytes = 0
        largest_document_bytes = 0
        file_type_stats = {}
        actual_files = []
        
        if os.path.exists(self.upload_dir):
            for root, dirs, files in os.walk(self.upload_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        file_size = os.path.getsize(file_path)
                        total_storage_bytes += file_size
                        largest_document_bytes = max(largest_document_bytes, file_size)
                        
                        # Track by file type
                        file_ext = os.path.splitext(file)[1].lower()
                        if file_ext not in file_type_stats:
                            file_type_stats[file_ext] = {"count": 0, "total_bytes": 0}
                        file_type_stats[file_ext]["count"] += 1
                        file_type_stats[file_ext]["total_bytes"] += file_size
                        
                        actual_files.append(file_path)
                    except OSError:
                        pass
        
        # Calculate orphaned files
        result = await self.db.execute(
            select(models.Document.file_path)
        )
        db_file_paths = {row.file_path for row in result}
        
        orphaned_count = 0
        orphaned_bytes = 0
        for file_path in actual_files:
            if file_path not in db_file_paths:
                try:
                    orphaned_bytes += os.path.getsize(file_path)
                    orphaned_count += 1
                except OSError:
                    pass
        
        # Format storage by type
        storage_by_type = [
            {
                "file_type": file_type if file_type else "unknown",
                "count": stats["count"],
                "total_bytes": stats["total_bytes"],
                "total_human": self._format_bytes(stats["total_bytes"])
            }
            for file_type, stats in sorted(
                file_type_stats.items(), 
                key=lambda x: x[1]["total_bytes"], 
                reverse=True
            )
        ]
        
        avg_size = total_storage_bytes // len(actual_files) if actual_files else 0
        
        return StorageStatsDTO(
            total_documents=len(actual_files),
            total_storage_bytes=total_storage_bytes,
            total_storage_human=self._format_bytes(total_storage_bytes),
            avg_document_size_bytes=avg_size,
            largest_document_bytes=largest_document_bytes,
            orphaned_files_count=orphaned_count,
            orphaned_storage_bytes=orphaned_bytes,
            storage_by_type=storage_by_type
        )
    
    async def get_storage_by_user(
        self,
        limit: int = 50,
        sort_by: str = "storage"  # "storage" or "count"
    ) -> List[UserStorageDTO]:
        """
        Get storage usage breakdown by user
        
        Args:
            limit: Maximum number of users to return
            sort_by: Sort by "storage" (bytes) or "count" (document count)
            
        Returns:
            List of user storage statistics
        """
        # Get documents grouped by user
        result = await self.db.execute(
            select(
                models.Document.user_id,
                models.User.email,
                func.count(models.Document.id).label('doc_count')
            ).join(
                models.User,
                models.Document.user_id == models.User.id
            ).group_by(
                models.Document.user_id,
                models.User.email
            )
        )
        
        user_storage = []
        for row in result:
            user_id = str(row.user_id)
            user_email = row.email
            doc_count = row.doc_count
            
            # Get file sizes for this user
            user_docs = await self.db.execute(
                select(models.Document.file_path).where(
                    models.Document.user_id == row.user_id
                )
            )
            
            total_bytes = 0
            largest_bytes = 0
            for doc in user_docs:
                if os.path.exists(doc.file_path):
                    try:
                        file_size = os.path.getsize(doc.file_path)
                        total_bytes += file_size
                        largest_bytes = max(largest_bytes, file_size)
                    except OSError:
                        pass
            
            avg_bytes = total_bytes // doc_count if doc_count > 0 else 0
            
            user_storage.append(UserStorageDTO(
                user_id=user_id,
                user_email=user_email,
                document_count=doc_count,
                total_storage_bytes=total_bytes,
                total_storage_human=self._format_bytes(total_bytes),
                largest_document_bytes=largest_bytes,
                avg_document_size_bytes=avg_bytes
            ))
        
        # Sort results
        if sort_by == "storage":
            user_storage.sort(key=lambda x: x.total_storage_bytes, reverse=True)
        else:  # count
            user_storage.sort(key=lambda x: x.document_count, reverse=True)
        
        return user_storage[:limit]
    
    async def find_orphaned_files(self, limit: int = 100) -> List[OrphanedFileDTO]:
        """
        Find files on disk without database records
        
        Args:
            limit: Maximum number of orphaned files to return
            
        Returns:
            List of orphaned file information
        """
        if not os.path.exists(self.upload_dir):
            return []
        
        # Get all file paths from database
        result = await self.db.execute(
            select(models.Document.file_path)
        )
        db_file_paths = {row.file_path for row in result}
        
        # Scan disk for files
        orphaned = []
        for root, dirs, files in os.walk(self.upload_dir):
            for file in files:
                file_path = os.path.join(root, file)
                
                if file_path not in db_file_paths:
                    try:
                        file_size = os.path.getsize(file_path)
                        file_ext = os.path.splitext(file)[1].lower()
                        
                        orphaned.append(OrphanedFileDTO(
                            file_path=file_path,
                            size_bytes=file_size,
                            size_human=self._format_bytes(file_size),
                            file_type=file_ext if file_ext else None,
                            reason="no_database_record"
                        ))
                        
                        if len(orphaned) >= limit:
                            return orphaned
                    except OSError:
                        pass
        
        return orphaned
    
    async def cleanup_orphaned_files(
        self,
        admin_id: str,
        justification: str,
        max_files: int = 100
    ) -> int:
        """
        Delete orphaned files from disk
        
        Args:
            admin_id: ID of admin performing cleanup
            justification: Reason for cleanup
            max_files: Maximum number of files to delete (safety limit)
            
        Returns:
            Number of files deleted
        """
        orphaned = await self.find_orphaned_files(limit=max_files)
        
        if len(orphaned) >= max_files:
            raise ValueError(
                f"Too many orphaned files found ({len(orphaned)}+). "
                f"Refusing to delete more than {max_files} files. "
                "Review manually or increase limit."
            )
        
        deleted_count = 0
        deleted_bytes = 0
        deleted_files = []
        
        for orphaned_file in orphaned:
            try:
                os.remove(orphaned_file.file_path)
                deleted_count += 1
                deleted_bytes += orphaned_file.size_bytes
                deleted_files.append(orphaned_file.file_path)
            except OSError as e:
                print(f"Failed to delete {orphaned_file.file_path}: {e}")
        
        # Log the action
        await AdminService.log_action(
            self.db,
            admin_id=admin_id,
            action="storage_cleanup_orphaned",
            entity_type="storage",
            entity_id="orphaned_files",
            justification=justification,
            metadata={
                "files_deleted": deleted_count,
                "bytes_freed": deleted_bytes,
                "bytes_freed_human": self._format_bytes(deleted_bytes),
                "files": deleted_files[:50]  # Log first 50 files
            }
        )
        
        return deleted_count
    
    @staticmethod
    def _format_bytes(bytes_size: int) -> str:
        """Format bytes to human-readable string"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if bytes_size < 1024:
                return f"{bytes_size:.2f} {unit}"
            bytes_size /= 1024
        return f"{bytes_size:.2f} TB"
