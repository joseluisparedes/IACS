import fs from 'fs';
import path from 'path';

// 1. Update App.tsx
const appPath = path.join(process.cwd(), 'src/App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');

// Update sidebar main nav item click handler
const oldNavClick = `                  onClick={(e) => {
                    if ((item.path === '/' || item.path === '/nueva') && (window as any).isInitiativeProcessInProgress) {
                      e.preventDefault();
                      setPendingNavPath(item.path);
                      setShowNavConfirmModal(true);
                    }
                  }}`;

const newNavClick = `                  onClick={(e) => {
                    if (location.pathname !== item.path && (window as any).isInitiativeProcessInProgress) {
                      e.preventDefault();
                      setPendingNavPath(item.path);
                      setShowNavConfirmModal(true);
                    }
                  }}`;

if (appContent.includes(oldNavClick)) {
  appContent = appContent.replace(oldNavClick, newNavClick);
  console.log('✅ Updated main nav click handler in App.tsx');
}

// Add click handler to admin items in App.tsx
const oldAdminItem = `                                  <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`;

const newAdminItem = `                                  <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={(e) => {
                                      if (location.pathname !== item.path && (window as any).isInitiativeProcessInProgress) {
                                        e.preventDefault();
                                        setPendingNavPath(item.path);
                                        setShowNavConfirmModal(true);
                                      }
                                    }}
                                    className={`;

if (appContent.includes(oldAdminItem)) {
  appContent = appContent.replace(oldAdminItem, newAdminItem);
  console.log('✅ Updated admin nav click handler in App.tsx');
}

// Update modal text for editing vs new initiative
const oldModalText = `                <h3 className="text-base font-bold text-slate-900">¿Iniciar nueva necesidad?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ¿Estás seguro de que deseas iniciar una nueva necesidad? Se perderán todos los cambios no guardados en el proceso actual.
                </p>`;

const newModalText = `                <h3 className="text-base font-bold text-slate-900">
                  {pendingNavPath === '/nueva' ? '¿Iniciar nueva necesidad?' : '¿Salir del proceso de edición?'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {pendingNavPath === '/nueva'
                    ? '¿Estás seguro de que deseas iniciar una nueva necesidad? Se perderán todos los cambios no guardados en el proceso actual.'
                    : 'Estás saliendo de la edición. Si no has guardado los cambios, la información no guardada se perderá.'}
                </p>`;

if (appContent.includes(oldModalText)) {
  appContent = appContent.replace(oldModalText, newModalText);
  console.log('✅ Updated modal text in App.tsx');
}

fs.writeFileSync(appPath, appContent, 'utf8');

// 2. Update InitiativeForm.tsx
const formPath = path.join(process.cwd(), 'src/pages/InitiativeForm.tsx');
let formContent = fs.readFileSync(formPath, 'utf8');

const oldInProgressEffect = `  useEffect(() => {
    (window as any).isInitiativeProcessInProgress = (selectedPath !== 'select');
    return () => {
      (window as any).isInitiativeProcessInProgress = false;
    };
  }, [selectedPath]);`;

const newInProgressEffect = `  useEffect(() => {
    (window as any).isInitiativeProcessInProgress = (selectedPath !== 'select' || !!id);
    return () => {
      (window as any).isInitiativeProcessInProgress = false;
    };
  }, [selectedPath, id]);`;

if (formContent.includes(oldInProgressEffect)) {
  formContent = formContent.replace(oldInProgressEffect, newInProgressEffect);
  console.log('✅ Updated isInitiativeProcessInProgress in InitiativeForm.tsx');
}

fs.writeFileSync(formPath, formContent, 'utf8');
