import { applyI18n, t } from './i18n';
import { getStorageValue, setStorage, Task, SubTask } from './storage';
import { getDefaultTemplates } from './templates';

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
        li.className = 'task-item-container';
        
        const mainItem = document.createElement('div');
        mainItem.className = 'task-item';
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'task-title';
        titleSpan.textContent = task.title;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';

        const templateBtn = document.createElement('button');
        templateBtn.className = 'template-btn';
        templateBtn.textContent = '🪄';
        templateBtn.title = t('popup_template_button') || 'Use Template';
        templateBtn.addEventListener('click', () => toggleTemplateList(task.id, li));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = t('popup_delete_button');
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        actionsDiv.appendChild(templateBtn);
        actionsDiv.appendChild(deleteBtn);
        
        mainItem.appendChild(titleSpan);
        mainItem.appendChild(actionsDiv);
        li.appendChild(mainItem);

        // Subtasks list (even if empty)
        if (task.subtasks && task.subtasks.length > 0) {
          const subUl = document.createElement('ul');
          subUl.className = 'subtask-list';
          task.subtasks.forEach(sub => {
            const subLi = document.createElement('li');
            subLi.className = 'subtask-item';
            subLi.textContent = sub.title;
            subUl.appendChild(subLi);
          });
          li.appendChild(subUl);
        }

        taskList.appendChild(li);
      });
    }
  };

  /**
   * Toggle template selection list
   */
  const toggleTemplateList = (taskId: string, container: HTMLElement) => {
    const existingList = container.querySelector('.template-selector');
    if (existingList) {
      existingList.remove();
      return;
    }

    const selector = document.createElement('div');
    selector.className = 'template-selector';
    
    const templates = getDefaultTemplates();
    templates.forEach(template => {
      const btn = document.createElement('button');
      btn.className = 'template-option';
      btn.textContent = template.title;
      btn.addEventListener('click', () => applyTemplate(taskId, template.id));
      selector.appendChild(btn);
    });

    container.appendChild(selector);
  };

  /**
   * Apply a template to a task
   */
  const applyTemplate = async (taskId: string, templateId: string) => {
    const tasks = await getStorageValue('tasks') || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const templates = getDefaultTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const newSubtasks: SubTask[] = template.subtasks.map(title => ({
      id: crypto.randomUUID(),
      title,
      completed: false
    }));

    tasks[taskIndex].subtasks = [...tasks[taskIndex].subtasks, ...newSubtasks];
    
    await setStorage({ tasks });
    renderTasks();
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
