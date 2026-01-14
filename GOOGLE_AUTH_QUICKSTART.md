# 🧪 Guía Rápida de Prueba - Google OAuth

Esta es una guía simplificada para probar el inicio de sesión con Google en tu entorno de desarrollo local.

## ⚡ Inicio Rápido (5 minutos)

### 1️⃣ Obtener Credenciales de Google

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs y servicios** > **Credenciales**
4. Haz clic en **+ Crear credenciales** > **ID de cliente de OAuth 2.0**
5. Si es tu primera vez, configura la pantalla de consentimiento:
   - Tipo: **Externo**
   - Nombre: `BetTracker Pro`
   - Email de soporte: tu email
   - Click **Guardar y continuar** hasta terminar
6. Vuelve a crear las credenciales OAuth:

   - Tipo de aplicación: **Aplicación web**
   - Orígenes JavaScript autorizados:
     ```
     http://localhost:3000
     ```
   - URIs de redirección autorizados:
     ```
     https://qfoesitcsiuyswqlyegt.supabase.co/auth/v1/callback
     ```
   - ⚠️ **Reemplaza** `qfoesitcsiuyswqlyegt` con el ID de tu proyecto Supabase

7. Copia el **Client ID** y **Client Secret**

### 2️⃣ Configurar Supabase

1. Ve a tu [Dashboard de Supabase](https://app.supabase.com/)
2. Selecciona tu proyecto
3. Ve a **Authentication** > **Providers**
4. Encuentra **Google** en la lista
5. Activa el toggle **"Google Enabled"**
6. Pega:
   - **Client ID**: el que copiaste de Google
   - **Client Secret**: el que copiaste de Google
7. Haz clic en **"Save"**

### 3️⃣ Probar la Integración

1. Asegúrate de que tu app esté corriendo:

   ```bash
   npm run dev
   ```

2. Abre en tu navegador:

   ```
   http://localhost:3000/login
   ```

3. Verás el botón **"Continuar con Google"** o **"Registrarse con Google"**

4. Haz clic en él

5. Autoriza tu cuenta de Google

6. ¡Deberías ser redirigido a `/dashboard` con tu sesión iniciada! 🎉

---

## ✅ Verificación

### Comprobar que funcionó:

1. Ve a tu Dashboard de Supabase
2. **Authentication** > **Users**
3. Deberías ver tu usuario con:

   - Email: tu email de Google
   - Provider: **google**
   - Confirmed: ✅ Yes (automático con Google)

4. Ve a **Database** > **Table Editor** > **app_users**
5. Tu perfil debería estar creado automáticamente

---

## 🐛 Problemas Comunes

### "redirect_uri_mismatch"

- **Causa**: La URL de callback no coincide
- **Solución**: Verifica que en Google Cloud Console la URI sea exactamente:
  ```
  https://<TU-PROYECTO>.supabase.co/auth/v1/callback
  ```

### "Access blocked"

- **Causa**: Falta configurar la pantalla de consentimiento
- **Solución**: Completa todos los campos obligatorios en OAuth consent screen

### El botón no hace nada

- **Causa**: Google no está habilitado en Supabase
- **Solución**: Activa Google en Authentication > Providers y guarda las credenciales

---

## 📝 Notas Importantes

- ✅ El inicio de sesión con Google **NO requiere confirmación de email**
- ✅ Los usuarios de Google se crean automáticamente en `app_users`
- ✅ El proveedor aparece como "google" en la base de datos
- ✅ Funciona tanto para registro como para login (mismo flujo)

---

## 🚀 Para Producción

Cuando despliegues tu app:

1. Agrega tu dominio de producción a **Orígenes JavaScript autorizados** en Google Cloud:

   ```
   https://tu-dominio.com
   ```

2. La URI de callback de Supabase sigue siendo la misma (termina en `.supabase.co`)

3. Publica tu app en Google Cloud Console:
   - Ve a **OAuth consent screen**
   - Haz clic en **"Publicar aplicación"**
   - Esto permite que cualquier usuario de Google pueda autenticarse

---

## 🎉 ¡Eso es todo!

Tu integración de Google OAuth está lista. Los usuarios ahora pueden:

- Registrarse en segundos
- Iniciar sesión sin contraseña
- Tener una experiencia moderna y segura

**¿Necesitas la guía completa con más detalles?** → Ver [GOOGLE_AUTH_SETUP.md](./GOOGLE_AUTH_SETUP.md)
