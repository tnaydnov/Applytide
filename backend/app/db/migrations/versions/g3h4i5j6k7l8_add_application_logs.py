"""add application_logs table

Revision ID: g3h4i5j6k7l8
Revises: f2a3b4c5d6e7
Create Date: 2025-10-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'g3h4i5j6k7l8'
down_revision = 'f2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade():
    # Create application_logs table
    op.create_table(
        'application_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        
        # Log metadata
        sa.Column('level', sa.String(length=20), nullable=False),
        sa.Column('logger', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        
        # Request context
        sa.Column('request_id', sa.String(length=50), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=True),
        
        # HTTP request info
        sa.Column('endpoint', sa.String(length=500), nullable=True),
        sa.Column('method', sa.String(length=10), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        
        # Client info
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        
        # Source code location
        sa.Column('module', sa.String(length=255), nullable=True),
        sa.Column('function', sa.String(length=255), nullable=True),
        sa.Column('line_number', sa.Integer(), nullable=True),
        
        # Exception info
        sa.Column('exception_type', sa.String(length=255), nullable=True),
        sa.Column('exception_message', sa.Text(), nullable=True),
        sa.Column('stack_trace', sa.Text(), nullable=True),
        
        # Additional structured data
        sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        
        # Foreign key constraint
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for efficient querying
    op.create_index('ix_application_logs_timestamp', 'application_logs', ['timestamp'])
    op.create_index('ix_application_logs_level', 'application_logs', ['level'])
    op.create_index('ix_application_logs_logger', 'application_logs', ['logger'])
    op.create_index('ix_application_logs_request_id', 'application_logs', ['request_id'])
    op.create_index('ix_application_logs_user_id', 'application_logs', ['user_id'])
    op.create_index('ix_application_logs_endpoint', 'application_logs', ['endpoint'])
    op.create_index('ix_application_logs_status_code', 'application_logs', ['status_code'])
    op.create_index('ix_application_logs_ip_address', 'application_logs', ['ip_address'])
    op.create_index('ix_application_logs_exception_type', 'application_logs', ['exception_type'])
    
    # Composite index for common queries
    op.create_index(
        'ix_application_logs_timestamp_level',
        'application_logs',
        ['timestamp', 'level']
    )
    op.create_index(
        'ix_application_logs_user_timestamp',
        'application_logs',
        ['user_id', 'timestamp']
    )


def downgrade():
    # Drop indexes
    op.drop_index('ix_application_logs_user_timestamp', table_name='application_logs')
    op.drop_index('ix_application_logs_timestamp_level', table_name='application_logs')
    op.drop_index('ix_application_logs_exception_type', table_name='application_logs')
    op.drop_index('ix_application_logs_ip_address', table_name='application_logs')
    op.drop_index('ix_application_logs_status_code', table_name='application_logs')
    op.drop_index('ix_application_logs_endpoint', table_name='application_logs')
    op.drop_index('ix_application_logs_user_id', table_name='application_logs')
    op.drop_index('ix_application_logs_request_id', table_name='application_logs')
    op.drop_index('ix_application_logs_logger', table_name='application_logs')
    op.drop_index('ix_application_logs_level', table_name='application_logs')
    op.drop_index('ix_application_logs_timestamp', table_name='application_logs')
    
    # Drop table
    op.drop_table('application_logs')
