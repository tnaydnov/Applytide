# First import Base class
from app.db.base import Base
from app.db.session import engine

# Import all model files to register them with Base
print('Importing models...')
import app.db.models
import app.documents.models
import app.models.user_profile

# Check what models are registered
print('\nModels registered with Base:')
model_count = 0
for cls in Base.registry.mappers:
    if hasattr(cls.class_, '__tablename__'):
        print(f'- {cls.class_.__name__} ({cls.class_.__tablename__})')
        model_count += 1
        
if model_count == 0:
    print('WARNING: No models found registered with Base!')

# Create all tables
print('\nCreating tables...')
Base.metadata.create_all(bind=engine)
print('Database tables created successfully!')

# Verify tables were created
from sqlalchemy import inspect
inspector = inspect(engine)
print('\nTables in database:')
for table_name in inspector.get_table_names():
    print(f'- {table_name}')
