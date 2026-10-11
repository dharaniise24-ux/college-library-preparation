from pydantic import BaseModel
from typing import List


class Book(BaseModel):
    subject: str
    book_name: str
    author: str
    edition: str
    publication_year: int
    content: List[str]