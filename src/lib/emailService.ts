import nodemailer from 'nodemailer';
import { supabase } from './supabase';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  initiativeId?: string | null;
}

// 1. Configure SMTP Transporter (if environment variables exist)
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

const emailFrom = process.env.SMTP_FROM || 'IACS Notificaciones <no-reply@iacs.empresa.com>';

/**
 * Inserts a log record into Supabase email_logs table
 */
async function logEmail(payload: EmailPayload, status: 'sent' | 'failed', errorMessage?: string) {
  try {
    const { error } = await supabase
      .from('email_logs')
      .insert([{
        initiative_id: payload.initiativeId || null,
        recipient: payload.to,
        subject: payload.subject,
        body: payload.html,
        status: status,
        error_message: errorMessage || null
      }]);
    if (error) {
      console.error('Error writing to email_logs:', error.message);
    }
  } catch (err: any) {
    console.error('Failed to log email:', err.message);
  }
}

/**
 * Sends an email using SMTP if configured, otherwise simulates sending.
 * In both cases, the action is logged in the DB.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  console.log(`[Email Service] Attempting to send email to ${payload.to}. Subject: "${payload.subject}"`);
  
  if (transporter) {
    try {
      await transporter.sendMail({
        from: emailFrom,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });
      await logEmail(payload, 'sent');
      console.log(`[Email Service] SMTP sent successfully to ${payload.to}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Email Service] SMTP failed to send to ${payload.to}:`, err.message);
      await logEmail(payload, 'failed', err.message);
      return { success: false, error: err.message };
    }
  } else {
    // Simulator Mode (SMTP not configured)
    console.log(`[Email Service] SMTP not configured. Logged simulation to email_logs for recipient: ${payload.to}`);
    await logEmail(payload, 'sent');
    return { success: true };
  }
}

// ─── HTML Email Templates ───────────────────────────────────────────────────

function getBaseTemplate(title: string, bodyContent: string, actionUrl?: string, actionText?: string): string {
  const buttonHtml = actionUrl && actionText ? `
    <div style="text-align: center; margin: 30px 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:45px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="#4F5AF5">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${actionText}</center>
      </v:roundrect>
      <![endif]-->
      <a href="${actionUrl}" style="background-color: #4F5AF5; border-radius: 8px; color: #ffffff; display: inline-block; font-family: 'Outfit', 'Inter', sans-serif; font-size: 14px; font-weight: 600; line-height: 45px; text-align: center; text-decoration: none; width: 200px; -webkit-text-size-adjust: none; box-shadow: 0 4px 6px rgba(79, 90, 245, 0.2); transition: background-color 0.2s;">
        ${actionText}
      </a>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #F8FAFC;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
          border: 1px solid #E2E8F0;
        }
        .header {
          background: linear-gradient(135deg, #4F5AF5 0%, #7C3AED 100%);
          padding: 35px 40px;
          text-align: left;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px;
          color: #334155;
          font-size: 15px;
          line-height: 1.6;
        }
        .footer {
          background-color: #F8FAFC;
          padding: 25px 40px;
          text-align: center;
          font-size: 11px;
          color: #94A3B8;
          border-top: 1px solid #F1F5F9;
        }
        .card {
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
        }
        .badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge-pendiente { background-color: #EEF2FF; color: #4F5AF5; border: 1px solid #C7D2FE; }
        .badge-aprobada { background-color: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
        .badge-observada { background-color: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
        .badge-desestimada { background-color: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        td {
          padding: 8px 0;
          font-size: 13px;
        }
        td.label {
          color: #94A3B8;
          font-weight: 600;
          width: 35%;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
        }
        td.value {
          color: #1E293B;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Gestión de Necesidades TI</h1>
        </div>
        <div class="content">
          ${bodyContent}
          ${buttonHtml}
        </div>
        <div class="footer">
          <p>Este es un correo automático generado por la plataforma IACS. Por favor, no respondas a este mensaje.</p>
          <p>&copy; 2026 Plataforma de Automatización IACS. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getInitiativeDetailsTable(formData: any, summary: any, status: string): string {
  const title = summary?.titulo || formData?.titulo || 'Iniciativa sin título';
  const vp = formData?.vicepresidencia || 'No asignada';
  const dir = formData?.direccion || 'No asignada';
  const creator = formData?.registrador || 'No asignado';
  
  let statusBadgeClass = 'badge-pendiente';
  if (status === 'En demanda') statusBadgeClass = 'badge-aprobada';
  else if (status === 'Observada') statusBadgeClass = 'badge-observada';
  else if (status === 'Desestimada') statusBadgeClass = 'badge-desestimada';

  return `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px;">
        <span style="font-weight: 700; font-size: 14px; color: #1E293B;">Resumen del Requerimiento</span>
        <span class="badge ${statusBadgeClass}">${status}</span>
      </div>
      <table>
        <tr>
          <td class="label">Título:</td>
          <td class="value">${title}</td>
        </tr>
        <tr>
          <td class="label">Key user:</td>
          <td class="value">${creator}</td>
        </tr>
        <tr>
          <td class="label">Vicepresidencia:</td>
          <td class="value">${vp}</td>
        </tr>
        <tr>
          <td class="label">Dirección:</td>
          <td class="value">${dir}</td>
        </tr>
      </table>
    </div>
  `;
}

// ─── Exported Business Rules Notification Triggers ──────────────────────────

export async function processEmailNotifications(
  initiativeId: string,
  oldStatus: string,
  newStatus: string,
  formData: any,
  summary: any,
  registradorEmailFallback?: string | null
) {
  // Only process if there's a real status change (or initial submission)
  if (oldStatus === newStatus && oldStatus !== 'Borrador') return;

  const title = summary?.titulo || formData?.titulo || 'Nueva Iniciativa';
  const actionUrl = `${process.env.APP_URL || 'http://localhost:3000'}/iniciativa/${initiativeId}`;
  
  // Try to find registrador email inside formData or fallback
  const registradorEmail = formData?.registrador_email || registradorEmailFallback;

  console.log(`[Email Service] Processing transition for ${initiativeId}: ${oldStatus} -> ${newStatus}`);

  try {
    // ── RULE 1: Submitted for Approval (Any -> Pendiente de Aprobación) ────
    if (newStatus === 'Pendiente de aprobación') {
      const vpName = formData?.vicepresidencia;
      const dirName = formData?.direccion;

      if (vpName && dirName) {
        // Query VP email
        const { data: vpData } = await supabase.from('vps').select('email, name').eq('name', vpName).single();
        // Query Director email & name
        const { data: dirData } = await supabase.from('direcciones').select('email, director_name').eq('name', dirName).eq('vp_id', (await supabase.from('vps').select('id').eq('name', vpName).single()).data?.id).single();

        const tableHtml = getInitiativeDetailsTable(formData, summary, newStatus);

        // Send to VP
        if (vpData?.email) {
          const bodyHtml = getBaseTemplate(
            'Nueva Iniciativa Pendiente de Revisión',
            `<p>Estimado(a) Vicepresidente(a) de ${vpName},</p>
             <p>Se ha registrado una nueva iniciativa de TI en su división que requiere de su supervisión y aprobación formal.</p>
             ${tableHtml}
             <p>Por favor, ingrese al sistema para revisar los detalles técnicos y dar su conformidad.</p>`,
            actionUrl,
            'Revisar Iniciativa'
          );
          await sendEmail({
            to: vpData.email,
            subject: `📥 Nueva Iniciativa Pendiente: ${title}`,
            html: bodyHtml,
            initiativeId
          });
        }

        // Send to Director
        if (dirData?.email) {
          const bodyHtml = getBaseTemplate(
            'Nueva Iniciativa Pendiente de Revisión',
            `<p>Estimado(a) Director(a) ${dirData.director_name || ''},</p>
             <p>Se ha registrado una nueva iniciativa de TI en su dirección (${dirName}) que requiere de su revisión.</p>
             ${tableHtml}
             <p>Por favor, ingrese al sistema para validar los detalles y comentarios del asistente IA.</p>`,
            actionUrl,
            'Revisar Iniciativa'
          );
          await sendEmail({
            to: dirData.email,
            subject: `📥 Nueva Iniciativa Pendiente: ${title}`,
            html: bodyHtml,
            initiativeId
          });
        }
      }
    }

    // ── RULE 2: Observed (Any -> Observada) ──────────────────────────────
    if (newStatus === 'Observada' && registradorEmail) {
      // Find latest observation comment
      const rejectionReason = summary?.rejection_reason || 'Revisar las observaciones especificadas en la bandeja de entrada del sistema.';
      const tableHtml = getInitiativeDetailsTable(formData, summary, newStatus);
      const bodyHtml = getBaseTemplate(
        'Iniciativa con Observaciones',
        `<p>Estimado(a) ${formData?.registrador || 'Key user(a)'},</p>
         <p>Tu iniciativa de TI ha sido revisada por el Business Partner TI (BP) y se encuentra en estado <strong>Observada</strong>.</p>
         ${tableHtml}
         <div class="card" style="border-left: 4px solid #B45309; background-color: #FFFBEB;">
           <strong style="color: #B45309;">Comentarios / Observaciones del BP:</strong>
           <p style="margin-top: 8px; font-style: italic;">"${rejectionReason}"</p>
         </div>
         <p>Por favor, realiza las correcciones solicitadas e ingresa al asistente para volver a presentar la iniciativa.</p>`,
        actionUrl,
        'Corregir Iniciativa'
      );
      await sendEmail({
        to: registradorEmail,
        subject: `⚠️ Iniciativa Observada: ${title}`,
        html: bodyHtml,
        initiativeId
      });
    }

    // ── RULE 3: Approved (Any -> En demanda) ────────────────────────────────
    if (newStatus === 'En demanda') {
      const tableHtml = getInitiativeDetailsTable(formData, summary, newStatus);

      // Notify Registrador
      if (registradorEmail) {
        const bodyHtml = getBaseTemplate(
          'Iniciativa en Demanda',
          `<p>Estimado(a) ${formData?.registrador || 'Key user(a)'},</p>
           <p>¡Buenas noticias! Tu iniciativa de TI ha sido aprobada y se encuentra en estado <strong>En demanda</strong>.</p>
           ${tableHtml}
           <p>La iniciativa entrará en planificación de demanda en coordinación con los equipos correspondientes.</p>`,
          actionUrl,
          'Ver Iniciativa'
        );
        await sendEmail({
          to: registradorEmail,
          subject: `✅ Iniciativa en Demanda: ${title}`,
          html: bodyHtml,
          initiativeId
        });
      }
    }

    // ── RULE 4: Dismissed (Any -> Desestimada) ────────────────────────────
    if (newStatus === 'Desestimada' && registradorEmail) {
      const rejectionReason = summary?.rejection_reason || 'No cumple con las prioridades u objetivos estratégicos de la división para este período.';
      const tableHtml = getInitiativeDetailsTable(formData, summary, newStatus);
      const bodyHtml = getBaseTemplate(
        'Iniciativa Desestimada',
        `<p>Estimado(a) ${formData?.registrador || 'Key user(a)'},</p>
         <p>Te informamos que tu iniciativa de TI ha sido revisada y marcada como <strong>Desestimada</strong>.</p>
         ${tableHtml}
         <div class="card" style="border-left: 4px solid #64748B;">
           <strong>Motivo de Desestimación:</strong>
           <p style="margin-top: 8px; font-style: italic;">"${rejectionReason}"</p>
         </div>
         <p>Para más información o consultas, te sugerimos ponerte en contacto directo con tu Business Partner de TI.</p>`,
        actionUrl,
        'Ver Detalles'
      );
      await sendEmail({
        to: registradorEmail,
        subject: `❌ Iniciativa Desestimada: ${title}`,
        html: bodyHtml,
        initiativeId
      });
    }

  } catch (err: any) {
    console.error('[Email Service] Failed processing notifications:', err.message);
  }
}
