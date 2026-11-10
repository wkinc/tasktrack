(function () {
  var form = document.getElementById('task-form');
  var list = document.getElementById('task-list');
  var emptyMsg = document.getElementById('empty');
  var errorMsg = document.getElementById('form-error');
  var saveBtn = document.getElementById('save');
  var cancelBtn = document.getElementById('cancel');
  var formTitle = document.getElementById('form-title');
  var fields = ['title', 'description', 'due_date', 'priority', 'status'];
  var currentFilter = '';
  var editingId = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function api(method, url, body) {
    var options = { method: method, headers: {} };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    return fetch(url, options).then(function (res) {
      if (res.status === 204) return null;
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  function showError(message) {
    errorMsg.textContent = message || '';
    errorMsg.hidden = !message;
  }

  function resetForm() {
    editingId = null;
    form.reset();
    formTitle.textContent = 'Add a task';
    saveBtn.textContent = 'Add task';
    cancelBtn.hidden = true;
    showError('');
  }

  function startEdit(task) {
    editingId = task.id;
    fields.forEach(function (name) {
      document.getElementById(name).value = task[name] || '';
    });
    formTitle.textContent = 'Edit task';
    saveBtn.textContent = 'Save changes';
    cancelBtn.hidden = false;
    document.getElementById('title').focus();
  }

  function renderTask(task) {
    var li = el('li', 'task p-' + task.priority + (task.status === 'Done' ? ' done' : ''));
    var head = el('div', 't-head');
    head.appendChild(el('span', 't-title', task.title));
    li.appendChild(head);

    var meta = task.status + ' · ' + task.priority + ' priority';
    if (task.due_date) meta += ' · due ' + task.due_date;
    li.appendChild(el('div', 't-meta', meta));
    if (task.description) li.appendChild(el('p', 't-desc', task.description));

    var actions = el('div', 't-actions');
    if (task.status !== 'Done') {
      var done = el('button', '', 'Mark done');
      done.addEventListener('click', function () {
        api('PUT', '/api/tasks/' + task.id, { status: 'Done' }).then(load).catch(function (e) { showError(e.message); });
      });
      actions.appendChild(done);
    }
    var edit = el('button', '', 'Edit');
    edit.addEventListener('click', function () { startEdit(task); });
    actions.appendChild(edit);

    var del = el('button', 'delete', 'Delete');
    del.addEventListener('click', function () {
      api('DELETE', '/api/tasks/' + task.id).then(function () {
        if (editingId === task.id) resetForm();
        load();
      }).catch(function (e) { showError(e.message); });
    });
    actions.appendChild(del);
    li.appendChild(actions);
    return li;
  }

  function load() {
    var url = '/api/tasks' + (currentFilter ? '?status=' + encodeURIComponent(currentFilter) : '');
    return api('GET', url).then(function (tasks) {
      list.textContent = '';
      tasks.forEach(function (task) { list.appendChild(renderTask(task)); });
      emptyMsg.hidden = tasks.length > 0;
    }).catch(function (e) { showError(e.message); });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var body = {};
    fields.forEach(function (name) { body[name] = document.getElementById(name).value; });
    var request = editingId
      ? api('PUT', '/api/tasks/' + editingId, body)
      : api('POST', '/api/tasks', body);
    request.then(function () { resetForm(); return load(); }).catch(function (e) { showError(e.message); });
  });

  cancelBtn.addEventListener('click', resetForm);

  document.getElementById('filters').addEventListener('click', function (event) {
    if (event.target.tagName !== 'BUTTON') return;
    currentFilter = event.target.getAttribute('data-status');
    Array.prototype.forEach.call(this.children, function (btn) {
      btn.classList.toggle('active', btn === event.target);
    });
    load();
  });

  fetch('/health').then(function (res) { return res.json(); }).then(function (data) {
    document.getElementById('version').textContent = 'version ' + data.version;
  }).catch(function () {
    document.getElementById('version').textContent = 'version unknown';
  });

  load();
})();
