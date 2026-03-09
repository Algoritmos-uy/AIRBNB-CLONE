ALTER TABLE reservations ADD user_id INT;
IF NOT EXISTS (
	SELECT 1 FROM sys.indexes
	WHERE name = 'idx_reservations_user_id' AND object_id = OBJECT_ID('dbo.reservations')
)
	CREATE INDEX idx_reservations_user_id ON reservations(user_id);