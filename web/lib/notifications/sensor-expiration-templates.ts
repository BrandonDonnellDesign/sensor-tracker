/**
 * Sensor Expiration Notification Templates
 * Pre-defined templates for different types of sensor expiration alerts
 */

export interface SensorExpirationTemplate {
  id: string;
  type: string;
  name: string;
  title_template: string;
  message_template: string;
  is_active: boolean;
  ab_test_group?: string;
  ab_test_weight?: number;
}

export const SENSOR_EXPIRATION_TEMPLATES: SensorExpirationTemplate[] = [
  // Sensor Expiry Warning Templates (for 3-day, 1-day, day-of alerts)
  {
    id: 'sensor_expiry_warning_default',
    type: 'sensor_expiry_warning',
    name: 'Sensor Expiry Warning (Default)',
    title_template: '📅 Sensor expires soon',
    message_template: 'Your {{sensorModel}} sensor will expire on {{expirationDate}}. Make sure you have a replacement ready to ensure continuous glucose monitoring.',
    is_active: true,
    ab_test_group: 'default',
    ab_test_weight: 70
  },
  {
    id: 'sensor_expiry_warning_urgent',
    type: 'sensor_expiry_warning',
    name: 'Sensor Expiry Warning (Urgent)',
    title_template: '⚠️ Sensor replacement needed soon',
    message_template: 'Important: Your {{sensorModel}} expires soon ({{expirationDate}}). Make sure you have a replacement ready to avoid gaps in monitoring.',
    is_active: true,
    ab_test_group: 'urgent',
    ab_test_weight: 30
  },

  // Sensor Expired Templates (for expired sensors)
  {
    id: 'sensor_expired_default',
    type: 'sensor_expired',
    name: 'Sensor Expired (Default)',
    title_template: '🔴 Sensor replacement overdue',
    message_template: 'Your {{sensorModel}} sensor has expired. Replace it immediately to resume glucose monitoring and maintain your diabetes management.',
    is_active: true,
    ab_test_group: 'default',
    ab_test_weight: 60
  },
  {
    id: 'sensor_expired_health',
    type: 'sensor_expired',
    name: 'Sensor Expired (Health Focus)',
    title_template: '💊 Your health depends on sensor replacement',
    message_template: 'Critical: Your {{sensorModel}} has expired. Your diabetes management is at risk without continuous monitoring. Replace immediately.',
    is_active: true,
    ab_test_group: 'health',
    ab_test_weight: 40
  },

  // Grace Period Template (for Dexcom 12-hour grace period)
  {
    id: 'sensor_grace_period_default',
    type: 'sensor_grace_period',
    name: 'Sensor Grace Period Alert',
    title_template: '⏳ Sensor has expired - {{graceTimeLeft}} remaining',
    message_template: 'Your {{sensorModel}} has expired. Change your sensor as soon as possible. You are now in the 12-hour grace period with {{graceTimeLeft}} remaining.',
    is_active: true,
    ab_test_group: 'default',
    ab_test_weight: 100
  }
];

/**
 * Get templates by type
 */
export function getTemplatesByType(type: string): SensorExpirationTemplate[] {
  return SENSOR_EXPIRATION_TEMPLATES.filter(template => 
    template.type === type && template.is_active
  );
}

/**
 * Get a random template for A/B testing
 */
export function selectTemplate(type: string): SensorExpirationTemplate | null {
  const templates = getTemplatesByType(type);
  
  if (templates.length === 0) {
    return null;
  }
  
  if (templates.length === 1) {
    return templates[0];
  }
  
  // Weighted random selection for A/B testing
  const totalWeight = templates.reduce((sum, template) => sum + (template.ab_test_weight || 1), 0);
  const random = Math.random() * totalWeight;
  
  let currentWeight = 0;
  for (const template of templates) {
    currentWeight += template.ab_test_weight || 1;
    if (random <= currentWeight) {
      return template;
    }
  }
  
  return templates[0]; // Fallback
}

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(
  template: string, 
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

/**
 * Get alert priority level based on alert type for sorting
 */
export function getAlertPriorityLevel(alertType: string): number {
  switch (alertType) {
    case 'sensor_expiry_3_day': return 2; // medium
    case 'sensor_expiry_1_day': return 3; // high
    case 'sensor_expiry_day_of': return 4; // critical
    case 'sensor_expiry_replacement_reminder': return 4; // critical
    case 'sensor_expiry_grace_period': return 3; // high
    default: return 2;
  }
}

/**
 * Validate template variables
 */
export function validateTemplateVariables(
  template: SensorExpirationTemplate,
  variables: Record<string, string>
): { isValid: boolean; missingVariables: string[] } {
  const templateText = `${template.title_template} ${template.message_template}`;
  const requiredVariables = templateText.match(/\{\{(\w+)\}\}/g)?.map(match => 
    match.replace(/[{}]/g, '')
  ) || [];
  
  const missingVariables = requiredVariables.filter(variable => 
    !variables.hasOwnProperty(variable)
  );
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
}