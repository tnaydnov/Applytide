"""
Custom log handlers for database logging
"""

import logging
import queue
import threading
import time
from typing import List, Dict, Any, Optional
from datetime import datetime


class DatabaseHandler(logging.Handler):
    """
    Async database log handler
    
    Batches log records and writes them to database in background thread.
    This prevents logging from blocking request handling.
    
    Features:
    - Batching: Collects logs and writes in batches
    - Async: Background thread for database writes
    - Buffer: In-memory queue to handle bursts
    - Graceful: Flushes on shutdown
    """
    
    def __init__(
        self,
        batch_size: int = 100,
        flush_interval: float = 10.0,
        max_queue_size: int = 10000
    ):
        super().__init__()
        
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.max_queue_size = max_queue_size
        
        # Queue for log records
        self.queue: queue.Queue = queue.Queue(maxsize=max_queue_size)
        
        # Background thread
        self.thread: Optional[threading.Thread] = None
        self.stop_event = threading.Event()
        self.flush_event = threading.Event()
        
        # Start background thread
        self._start_thread()
    
    def emit(self, record: logging.LogRecord):
        """
        Add log record to queue
        
        Non-blocking - drops logs if queue is full to prevent blocking
        """
        try:
            # Format the record
            formatted_record = self._format_record(record)
            
            # Add to queue (don't block if full)
            self.queue.put_nowait(formatted_record)
            
        except queue.Full:
            # Queue is full - drop this log to prevent blocking
            # Could log to stderr, but that might cause recursion
            pass
        except Exception:
            # Silently fail - don't break the application
            self.handleError(record)
    
    def _format_record(self, record: logging.LogRecord) -> Dict[str, Any]:
        """Convert log record to dictionary for database"""
        
        formatted = {
            'timestamp': datetime.utcfromtimestamp(record.created),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'request_id': getattr(record, 'request_id', None),
            'user_id': getattr(record, 'user_id', None),
            'session_id': getattr(record, 'session_id', None),
            'endpoint': getattr(record, 'endpoint', None),
            'method': getattr(record, 'method', None),
            'status_code': getattr(record, 'status_code', None),
            'ip_address': getattr(record, 'ip_address', None),
            'user_agent': getattr(record, 'user_agent', None),
            'module': record.module,
            'function': record.funcName,
            'line_number': record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            formatted['exception_type'] = record.exc_info[0].__name__ if record.exc_info[0] else None
            formatted['exception_message'] = str(record.exc_info[1]) if record.exc_info[1] else None
            formatted['stack_trace'] = self.formatter.formatException(record.exc_info) if record.exc_info else None
        
        # Add extra fields
        extra = {}
        for key, value in record.__dict__.items():
            if key not in [
                'name', 'msg', 'args', 'created', 'filename', 'funcName',
                'levelname', 'levelno', 'lineno', 'module', 'msecs',
                'message', 'pathname', 'process', 'processName', 'relativeCreated',
                'thread', 'threadName', 'exc_info', 'exc_text', 'stack_info',
                'getMessage', 'request_id', 'user_id', 'session_id', 'ip_address',
                'user_agent', 'endpoint', 'method', 'status_code'
            ]:
                extra[key] = value
        
        if extra:
            formatted['extra'] = extra
        
        return formatted
    
    def _start_thread(self):
        """Start background thread for database writes"""
        self.thread = threading.Thread(target=self._background_writer, daemon=True)
        self.thread.start()
    
    def _background_writer(self):
        """Background thread that writes logs to database"""
        batch: List[Dict[str, Any]] = []
        last_flush_time = time.time()
        
        while not self.stop_event.is_set():
            try:
                # Wait for log or timeout
                try:
                    record = self.queue.get(timeout=1.0)
                    batch.append(record)
                except queue.Empty:
                    pass
                
                # Check if we should flush
                current_time = time.time()
                should_flush = (
                    len(batch) >= self.batch_size or
                    (current_time - last_flush_time) >= self.flush_interval or
                    self.flush_event.is_set()
                )
                
                if should_flush and batch:
                    self._write_batch(batch)
                    batch.clear()
                    last_flush_time = current_time
                    self.flush_event.clear()
                
            except Exception as e:
                # Log error but continue
                import sys
                sys.stderr.write(f"Error in database logging thread: {e}\n")
        
        # Final flush on shutdown
        if batch:
            self._write_batch(batch)
    
    def _write_batch(self, batch: List[Dict[str, Any]]):
        """Write batch of logs to database"""
        try:
            # Import here to avoid circular imports
            from app.db.session import SessionLocal
            from app.db import models
            
            db = SessionLocal()
            try:
                # Create ApplicationLog objects
                logs = [
                    models.ApplicationLog(
                        timestamp=record['timestamp'],
                        level=record['level'],
                        logger=record['logger'],
                        message=record['message'][:1000],  # Truncate long messages
                        request_id=record.get('request_id'),
                        user_id=record.get('user_id'),
                        session_id=record.get('session_id'),
                        endpoint=record.get('endpoint'),
                        method=record.get('method'),
                        status_code=record.get('status_code'),
                        ip_address=record.get('ip_address'),
                        user_agent=record.get('user_agent')[:500] if record.get('user_agent') else None,
                        module=record.get('module'),
                        function=record.get('function'),
                        line_number=record.get('line_number'),
                        exception_type=record.get('exception_type'),
                        exception_message=record.get('exception_message')[:1000] if record.get('exception_message') else None,
                        stack_trace=record.get('stack_trace'),
                        extra=record.get('extra')
                    )
                    for record in batch
                ]
                
                # Bulk insert
                db.bulk_save_objects(logs)
                db.commit()
                
            finally:
                db.close()
                
        except Exception as e:
            # Don't crash on database errors
            import sys
            sys.stderr.write(f"Failed to write logs to database: {e}\n")
    
    def flush(self):
        """Force flush of pending logs"""
        self.flush_event.set()
        # Wait a bit for flush to complete
        time.sleep(0.5)
    
    def close(self):
        """Stop background thread and flush"""
        self.flush()
        self.stop_event.set()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5.0)
        super().close()
