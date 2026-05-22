import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  DEFAULT_EVENT_TEMPLATE,
  EVENT_TEMPLATE_STORAGE_KEY,
  eventTemplateOptions,
  eventTemplates,
  getEventTemplate
} from '../config/eventTemplates';

const EventTemplateContext = createContext(null);

const readStoredTemplate = () => {
  try {
    if (typeof window === 'undefined') return DEFAULT_EVENT_TEMPLATE;
    const stored = window.localStorage.getItem(EVENT_TEMPLATE_STORAGE_KEY);
    return eventTemplates[stored] ? stored : DEFAULT_EVENT_TEMPLATE;
  } catch (error) {
    return DEFAULT_EVENT_TEMPLATE;
  }
};

export function EventTemplateProvider({ children }) {
  const [templateKey, setTemplateKeyState] = useState(readStoredTemplate);

  const setTemplateKey = (nextTemplateKey) => {
    const safeTemplateKey = eventTemplates[nextTemplateKey] ? nextTemplateKey : DEFAULT_EVENT_TEMPLATE;
    setTemplateKeyState(safeTemplateKey);

    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(EVENT_TEMPLATE_STORAGE_KEY, safeTemplateKey);
    } catch (error) {
      // localStorage may be unavailable in private or restricted browser contexts.
    }
  };

  const value = useMemo(() => ({
    templateKey,
    template: getEventTemplate(templateKey),
    templates: eventTemplates,
    templateOptions: eventTemplateOptions,
    setTemplateKey
  }), [templateKey]);

  return (
    <EventTemplateContext.Provider value={value}>
      {children}
    </EventTemplateContext.Provider>
  );
}

export function useEventTemplate() {
  const context = useContext(EventTemplateContext);
  if (!context) {
    throw new Error('useEventTemplate must be used within EventTemplateProvider');
  }
  return context;
}
