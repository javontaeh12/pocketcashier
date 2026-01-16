/*
  # Remove javontaedharden@gmail.com from Developer Accounts

  Removes the developer account associated with javontaedharden@gmail.com,
  keeping only the admin account for this user.
*/

DELETE FROM developer_accounts
WHERE user_id = '671e4c0f-97e0-4275-a7c2-4ce7b728d4f4';