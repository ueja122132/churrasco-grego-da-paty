import React, { useState } from 'react';
import { SaaSLayout } from './saas-admin/components/SaaSLayout';
import { OverviewView } from './saas-admin/views/Overview';
import { CompaniesView } from './saas-admin/views/Companies';
import { FinancialView } from './saas-admin/views/Financial';
import { PlansView, LogsView } from './saas-admin/views/Plans';
import { TeamView, SystemView, SettingsView } from './saas-admin/views/SettingsTeam';
import { FixRLSView } from './saas-admin/views/FixRLS';
import { AnimatePresence, motion } from 'framer-motion';

interface SaaSAdminPageProps {
  user: any;
  notify: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const SaaSAdminPage: React.FC<SaaSAdminPageProps> = ({ user, notify }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <OverviewView />;
      case 'companies': return <CompaniesView />;
      case 'financial': return <FinancialView />;
      case 'plans': return <PlansView />;
      case 'logs': return <LogsView />;
      case 'team': return <TeamView />;
      case 'system': return <SystemView />;
      case 'settings': return <SettingsView />;
      case 'fix-rls': return <FixRLSView user={user} />;
      default: return <OverviewView />;
    }
  };

  return (
    <SaaSLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </SaaSLayout>
  );
};


