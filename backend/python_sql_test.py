import sqlalchemy
from sqlalchemy import text
import psycopg2

#Step 1: Create the engine 
engine = sqlalchemy.create_engine(
    'postgresql+psycopg2://postgres:Herobrin%402023@localhost:5432/postgres', #In future, safeguard inside of AWS
    #'postgresql+psycopg2://username:password@hostname:5432/dbname', #In future, safeguard inside of AWS
    echo=True, #logging
    pool_pre_ping=True #checks if connection is alive
    )

#Step 2: test adding reading and deleting data from user table
# use a transaction (begin) so INSERT/DELETE are committed
with engine.begin() as conn:
    result = conn.execute(
        text('INSERT INTO "user" (clerk_user_id, email) VALUES (:clerk_user_id, :email) RETURNING id;'),
        {"clerk_user_id": "Miguel67", "email": "miguelcavallin@gmail.com"}
    )
    new_user_id = result.fetchone()[0]
    print(f"New user ID: {new_user_id}")
    #Read back the user
    result = conn.execute(
        text('SELECT clerk_user_id FROM "user" WHERE id = :id;'),
        {"id": new_user_id}
    )
    user_clerk_id = result.fetchone()[0]
    print(f"Clerk User ID: {user_clerk_id}")
    result = conn.execute(
        text('DELETE FROM "user" WHERE id = :id;'),
        {"id": new_user_id}
    )
    #Get number of rows in table:
    result = conn.execute(
        text("SELECT COUNT(*) FROM \"user\";")
        )
    user_count = result.fetchone()[0]
    print(f"Total users in table: {user_count}")

