import { applyI18n, t } from './i18n';
import { getStorageValue, setStorage, Task } from './storage';

document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();

  const taskInput = document.getElementById('task-input') as HTMLInputElement;
  const addButton = document.getElementById('add-button') as HTMLButtonElement;
  const taskList = document.getElementById('task-list') as HTMLUListElement;
  const noTasks = document.getElementById('no-tasks') as HTMLParagraphElement;

  /**
   * Render the task list
   */
  const renderTasks = async () => {
    const tasks = await getStorageValue('tasks') || [];
    
    if (tasks.length === 0) {
      taskList.style.display = 'none';
      noTasks.style.display = 'block';
    } else {
      taskList.style.display = 'block';
      noTasks.style.display = 'none';
      taskList.innerHTML = '';
      
      tasks.sort((a, b) => b.createdAt - a.createdAt).forEach((task: Task) => {
        const li = document.createElement('li');
        li.className = 'task-item';
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'task-title';
        titleSpan.textContent = task.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = t('popup_delete_button');
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        li.appendChild(titleSpan);
        li.appendChild(deleteBtn);
        taskList.appendChild(li);
      });
    }
  };

  /**
   * Add a new task
   */
  const addTask = async () => {
    const title = taskInput.value.trim();
    if (!title) return;

    const tasks = await getStorageValue('tasks') || [];
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      subtasks: [],
      createdAt: Date.now()
    };

    await setStorage({ tasks: [newTask, ...tasks] });
    taskInput.value = '';
    renderTasks();
  };

  /**
   * Delete a task
   */
  const deleteTask = async (id: string) => {
    const tasks = await getStorageValue('tasks') || [];
    const updatedTasks = tasks.filter(t => t.id !== id);
    await setStorage({ tasks: updatedTasks });
    renderTasks();
  };

  addButton.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  });

  // Initial render
  renderTasks();
});
