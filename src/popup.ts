import { applyI18n, t } from './i18n';
import { getStorageValue, setStorage, Task, SubTask } from './storage';
import { getDefaultTemplates } from './templates';
import { subTaskTreeDesign, findNode } from './subtask-tree';
import {
  checkboxProgressDesign,
  cascadeComplete,
  recomputeParentCompletion,
  computeProgressPercent,
  formatPercent,
  countLeaves
} from './checkbox-progress';

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

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.setAttribute(
          'aria-label',
          t(checkboxProgressDesign.ariaLabelKey) || 'Toggle complete'
        );
        checkbox.addEventListener('change', () =>
          toggleTaskComplete(task.id, checkbox.checked)
        );

        const titleSpan = document.createElement('span');
        titleSpan.className = 'task-title';
        if (task.completed) titleSpan.classList.add('completed');
        titleSpan.textContent = task.title;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';

        const leafCount = countLeaves(task.subtasks);
        if (leafCount > 0) {
          const progressSpan = document.createElement('span');
          progressSpan.className = 'task-progress';
          progressSpan.textContent = formatPercent(
            computeProgressPercent(task.subtasks)
          );
          actionsDiv.appendChild(progressSpan);
        }

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

        mainItem.appendChild(checkbox);
        mainItem.appendChild(titleSpan);
        mainItem.appendChild(actionsDiv);
        li.appendChild(mainItem);

        if (task.subtasks && task.subtasks.length > 0) {
          const subUl = renderSubtaskTree(task.id, task.subtasks, 0);
          li.appendChild(subUl);
        }

        taskList.appendChild(li);
      });
    }
  };

  /**
   * Recursively render a subtask tree as a nested <ul>.
   * depth is the 0-based depth of the children being rendered.
   */
  const renderSubtaskTree = (
    taskId: string,
    nodes: SubTask[],
    depth: number
  ): HTMLUListElement => {
    const ul = document.createElement('ul');
    ul.className = 'subtask-list';
    ul.style.paddingLeft = `${30 + depth * subTaskTreeDesign.indentPx}px`;

    nodes.forEach((node) => {
      const subLi = document.createElement('li');
      subLi.className = 'subtask-item';

      const row = document.createElement('div');
      row.className = 'subtask-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'subtask-checkbox';
      checkbox.checked = node.completed;
      checkbox.setAttribute(
        'aria-label',
        t(checkboxProgressDesign.ariaLabelKey) || 'Toggle complete'
      );
      checkbox.addEventListener('change', () =>
        toggleSubtaskComplete(taskId, node.id, checkbox.checked)
      );
      row.appendChild(checkbox);

      const titleSpan = document.createElement('span');
      titleSpan.className = 'subtask-title';
      if (node.completed) titleSpan.classList.add('completed');
      titleSpan.textContent = node.title;
      row.appendChild(titleSpan);

      if (depth < subTaskTreeDesign.maxDepth) {
        const addChildBtn = document.createElement('button');
        addChildBtn.className = 'add-child-btn';
        addChildBtn.textContent = subTaskTreeDesign.addChildIcon;
        addChildBtn.title = t('popup_add_subtask') || 'Add subtask';
        addChildBtn.addEventListener('click', () =>
          promptAddChild(taskId, node.id, subLi)
        );
        row.appendChild(addChildBtn);
      }

      subLi.appendChild(row);

      if (node.children && node.children.length > 0) {
        const childUl = renderSubtaskTree(taskId, node.children, depth + 1);
        subLi.appendChild(childUl);
      }

      ul.appendChild(subLi);
    });

    return ul;
  };

  /**
   * Show an inline input under the node to add a child subtask.
   */
  const promptAddChild = (
    taskId: string,
    parentNodeId: string,
    container: HTMLElement
  ) => {
    const existing = container.querySelector(':scope > .add-child-input');
    if (existing) {
      existing.remove();
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'add-child-input';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = t('popup_add_subtask_placeholder') || 'Enter a subtask...';
    wrapper.appendChild(input);

    let submitted = false;
    const submit = async () => {
      if (submitted) return;
      submitted = true;
      const value = input.value.trim();
      if (!value) {
        wrapper.remove();
        return;
      }
      await addChildSubtask(taskId, parentNodeId, value);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        submitted = true;
        wrapper.remove();
      }
    });
    input.addEventListener('blur', submit);

    container.appendChild(wrapper);
    input.focus();
  };

  /**
   * Append a new child subtask under the given parent node id.
   */
  const addChildSubtask = async (
    taskId: string,
    parentNodeId: string,
    title: string
  ) => {
    const tasks = (await getStorageValue('tasks')) || [];
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const found = findNode(task.subtasks, parentNodeId);
    if (!found) return;
    const newChild: SubTask = {
      id: crypto.randomUUID(),
      title,
      completed: false
    };
    found.node.children = [...(found.node.children || []), newChild];
    await setStorage({ tasks });
    renderTasks();
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

    const heading = document.createElement('div');
    heading.className = 'template-selector-title';
    heading.textContent = t('popup_template_select') || 'Select Template';
    selector.appendChild(heading);

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
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;

    const templates = getDefaultTemplates();
    const template = templates.find(tmpl => tmpl.id === templateId);
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
   * Toggle the completed state of a top-level task. Cascades to all
   * descendant subtasks when the design enables it.
   */
  const toggleTaskComplete = async (taskId: string, completed: boolean) => {
    const tasks = (await getStorageValue('tasks')) || [];
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.completed = completed;
    if (checkboxProgressDesign.cascadeOnToggle && task.subtasks) {
      for (const child of task.subtasks) {
        cascadeComplete(child, completed);
      }
    }
    await setStorage({ tasks });
    renderTasks();
  };

  /**
   * Toggle the completed state of a subtask node. Cascades to descendants
   * and recomputes parent completion when enabled.
   */
  const toggleSubtaskComplete = async (
    taskId: string,
    nodeId: string,
    completed: boolean
  ) => {
    const tasks = (await getStorageValue('tasks')) || [];
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const found = findNode(task.subtasks, nodeId);
    if (!found) return;

    if (checkboxProgressDesign.cascadeOnToggle) {
      cascadeComplete(found.node, completed);
    } else {
      found.node.completed = completed;
    }
    if (checkboxProgressDesign.autoCompleteParent) {
      recomputeParentCompletion(task.subtasks);
      const leafCount = countLeaves(task.subtasks);
      if (leafCount > 0) {
        task.completed = computeProgressPercent(task.subtasks) === 100;
      }
    }
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
    const updatedTasks = tasks.filter(task => task.id !== id);
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
