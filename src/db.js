const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function openDb(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      due_date    TEXT,
      priority    TEXT NOT NULL DEFAULT 'Medium',
      status      TEXT NOT NULL DEFAULT 'To Do',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

function createRepository(db) {
  const list = db.prepare('SELECT * FROM tasks ORDER BY id');
  const listByStatus = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY id');
  const get = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const insert = db.prepare(
    'INSERT INTO tasks (title, description, due_date, priority, status) VALUES (@title, @description, @due_date, @priority, @status)'
  );
  const update = db.prepare(
    'UPDATE tasks SET title=@title, description=@description, due_date=@due_date, priority=@priority, status=@status WHERE id=@id'
  );
  const remove = db.prepare('DELETE FROM tasks WHERE id = ?');

  return {
    all: (status) => (status ? listByStatus.all(status) : list.all()),
    find: (id) => get.get(id),
    create(task) {
      const info = insert.run(task);
      return get.get(info.lastInsertRowid);
    },
    update(id, task) {
      update.run({ ...task, id });
      return get.get(id);
    },
    delete: (id) => remove.run(id).changes > 0,
  };
}

module.exports = { openDb, createRepository };
