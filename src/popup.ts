import { applyI18n } from './i18n';
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
      
      tasks.forEach((task: Task) => {
        const li = document.createElement('li');
        li.textContent = task.title;
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

    await setStorage({ tasks: [...tasks, newTask] });
    taskInput.value = '';
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
