from app.db.session import SessionLocal
from app.db.models import User

db = SessionLocal()
user = db.query(User).filter(User.email == 'tnaydnov@gmail.com').first()
if user:
    print(f'User role: {user.role}')
else:
    print('User not found')
db.close()
