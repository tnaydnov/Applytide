from passlib.context import CryptContext
import secrets
import string

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_random_string(length: int = 32) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

def hash_password(raw: str) -> str:
    return _pwd.hash(raw)

def verify_password(raw: str, hashed: str) -> bool:
    return _pwd.verify(raw, hashed)
