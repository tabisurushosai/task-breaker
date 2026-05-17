import { Template } from './storage';

/**
 * Get default templates based on current language
 */
export function getDefaultTemplates(): Template[] {
  const lang = chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';

  if (lang === 'ja') {
    return [
      {
        id: 'clean-room',
        title: '部屋の掃除',
        subtasks: ['ゴミを捨てる', '洗濯物を畳む', '床を掃除機でかける']
      },
      {
        id: 'study',
        title: '勉強の準備',
        subtasks: ['机を片付ける', '教材を準備する', 'タイマーをセットする']
      },
      {
        id: 'morning-routine',
        title: '朝のルーチン',
        subtasks: ['顔を洗う', '着替える', '朝食を食べる', '歯を磨く']
      },
      {
        id: 'go-out',
        title: '外出の準備',
        subtasks: ['持ち物を確認する', '戸締りを確認する', '靴を履く']
      }
    ];
  } else {
    return [
      {
        id: 'clean-room',
        title: 'Clean Room',
        subtasks: ['Throw away trash', 'Fold laundry', 'Vacuum the floor']
      },
      {
        id: 'study',
        title: 'Study Prep',
        subtasks: ['Clear the desk', 'Prepare materials', 'Set a timer']
      },
      {
        id: 'morning-routine',
        title: 'Morning Routine',
        subtasks: ['Wash face', 'Get dressed', 'Eat breakfast', 'Brush teeth']
      },
      {
        id: 'go-out',
        title: 'Getting Ready to Go Out',
        subtasks: ['Check belongings', 'Check locks', 'Put on shoes']
      }
    ];
  }
}

/**
 * Interface for the design of the template breaker UI/UX
 */
export interface TemplateBreakerDesign {
  /**
   * The button to trigger template selection should be an icon (e.g., magic wand)
   * next to the task title in the list.
   */
  triggerIcon: string;
  
  /**
   * When clicked, a modal or a dropdown should appear with the list of templates.
   */
  selectionMode: 'modal' | 'dropdown';
  
  /**
   * Applying a template adds the subtasks to the existing task's subtasks list.
   */
  applyBehavior: 'append' | 'replace';
}

export const templateBreakerDesign: TemplateBreakerDesign = {
  triggerIcon: '🪄',
  selectionMode: 'dropdown',
  applyBehavior: 'append'
};
