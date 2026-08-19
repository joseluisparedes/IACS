import fs from 'fs';
import path from 'path';

// 1. Update InitiativeForm.tsx when !restored or !id
const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

const oldFreshSession = `          if (!restored) {
            // Fresh session
            const initial: Record<string, any> = {};
            allVisibleFormFields.forEach((f: FieldDefinition) => {
              if (f.field_type === "select") {
                initial[f.key] = f.allow_multiple ? [] : "";
              } else {
                initial[f.key] = "";
              }
            });
            setFormData(initial);
          }`;

const newFreshSession = `          if (!restored) {
            // Fresh session — reset completely to Step 1 Options Screen
            const initial: Record<string, any> = {};
            allVisibleFormFields.forEach((f: FieldDefinition) => {
              if (f.field_type === "select") {
                initial[f.key] = f.allow_multiple ? [] : "";
              } else {
                initial[f.key] = "";
              }
            });
            setFormData(initial);
            setConfirmedFields({});
            setUnstructuredText("");
            setChatHistory([]);
            setSummary(null);
            setAiWarnings({});
            setStep(1);
            setSelectedPath('select');
          }`;

if (formContent.includes(oldFreshSession)) {
  formContent = formContent.replace(oldFreshSession, newFreshSession);
  console.log('✅ Updated fresh session reset in InitiativeForm.tsx');
} else {
  console.error('❌ Could not find oldFreshSession in InitiativeForm.tsx');
}

// Also add a location key/state listener to reset when navigating to /nueva without id
const oldEffectEnd = `  }, [id]);`;
const newEffectEnd = `  }, [id, location.pathname, location.key]);`;

if (formContent.includes(oldEffectEnd)) {
  formContent = formContent.replace(oldEffectEnd, newEffectEnd);
  console.log('✅ Updated useEffect dependencies in InitiativeForm.tsx');
}

fs.writeFileSync(formPath, formContent, 'utf8');

// 2. Update App.tsx modal confirm click to reset
const appPath = path.join(process.cwd(), 'src/App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');

const oldModalConfirmClick = `                  setShowNavConfirmModal(false);
                  (window as any).isInitiativeProcessInProgress = false;
                  if (pendingNavPath) {
                    navigate(pendingNavPath);
                  }`;

const newModalConfirmClick = `                  setShowNavConfirmModal(false);
                  (window as any).isInitiativeProcessInProgress = false;
                  if (pendingNavPath) {
                    if (pendingNavPath === '/nueva') {
                      navigate('/nueva', { replace: true, state: { reset: Date.now() } });
                    } else {
                      navigate(pendingNavPath);
                    }
                  }`;

if (appContent.includes(oldModalConfirmClick)) {
  appContent = appContent.replace(oldModalConfirmClick, newModalConfirmClick);
  fs.writeFileSync(appPath, appContent, 'utf8');
  console.log('✅ Updated modal confirm click handler in App.tsx');
}
