// PDF template presets + localStorage persistence for user-defined ones.

export const defaultTemplates = {
  professional: {
    name: 'Professional',
    accentColor: '#16a34a',
    textColor: '#111827',
    headerStyle: 'underlined',
    isDefault: true,
  },
  minimal: {
    name: 'Minimal',
    accentColor: '#6b7280',
    textColor: '#374151',
    headerStyle: 'simple',
    isDefault: true,
  },
  corporate: {
    name: 'Corporate',
    accentColor: '#2563eb',
    textColor: '#1e293b',
    headerStyle: 'boxed',
    isDefault: true,
  },
  creative: {
    name: 'Creative',
    accentColor: '#9333ea',
    textColor: '#111827',
    headerStyle: 'centered',
    isDefault: true,
  },
};

export const loadTemplates = () => {
  const saved = localStorage.getItem('pdfTemplates');
  if (saved) {
    try {
      return { ...defaultTemplates, ...JSON.parse(saved) };
    } catch {
      return { ...defaultTemplates };
    }
  }
  return { ...defaultTemplates };
};

export const persistTemplates = (templates) => {
  const custom = {};
  Object.entries(templates).forEach(([key, value]) => {
    if (!value.isDefault) custom[key] = value;
  });
  localStorage.setItem('pdfTemplates', JSON.stringify(custom));
};
