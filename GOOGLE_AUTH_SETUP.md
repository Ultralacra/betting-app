# 🔐 Configuración de Inicio de Sesión con Google

Esta guía te ayudará a configurar el inicio de sesión con Google en tu aplicación BetTracker Pro usando Supabase Auth.

## 📋 Requisitos Previos

- Cuenta de Supabase activa
- Cuenta de Google Cloud Console
- Tu aplicación ya debe estar funcionando localmente o en producción

---

## 🚀 Paso 1: Configurar Google Cloud Console

### 1.1 Crear un Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Haz clic en el selector de proyectos en la parte superior
3. Haz clic en **"Nuevo Proyecto"**
4. Asigna un nombre (ej: "BetTracker Pro")
5. Haz clic en **"Crear"**

### 1.2 Habilitar la API de Google+

1. En el menú lateral, ve a **"APIs y servicios"** > **"Biblioteca"**
2. Busca **"Google+ API"**
3. Haz clic en **"Habilitar"**

### 1.3 Configurar la Pantalla de Consentimiento OAuth

1. Ve a **"APIs y servicios"** > **"Pantalla de consentimiento de OAuth"**
2. Selecciona **"Externo"** (a menos que uses Google Workspace)
3. Haz clic en **"Crear"**
4. Completa los campos requeridos:
   - **Nombre de la aplicación**: BetTracker Pro
   - **Correo electrónico de asistencia**: tu email
   - **Logotipo de la aplicación**: (opcional)
   - **Dominio de la aplicación**: tu dominio (ej: bettracker.vercel.app)
   - **Correo electrónico del desarrollador**: tu email
5. Haz clic en **"Guardar y continuar"**
6. En **"Ámbitos"**, haz clic en **"Guardar y continuar"** (no necesitas ámbitos adicionales)
7. En **"Usuarios de prueba"**, agrega tu email si estás en modo "En producción"
8. Haz clic en **"Guardar y continuar"**

### 1.4 Crear Credenciales OAuth 2.0

1. Ve a **"APIs y servicios"** > **"Credenciales"**
2. Haz clic en **"+ Crear credenciales"** > **"ID de cliente de OAuth 2.0"**
3. Selecciona **"Aplicación web"**
4. Configura:

   - **Nombre**: BetTracker Pro Web Client
   - **Orígenes autorizados de JavaScript**:
     ```
     http://localhost:3000
     https://tu-dominio.com (si tienes dominio personalizado)
     ```
   - **URIs de redirección autorizados**:

     ```
     https://<TU-PROYECTO-SUPABASE>.supabase.co/auth/v1/callback
     ```

     ⚠️ **IMPORTANTE**: Reemplaza `<TU-PROYECTO-SUPABASE>` con el ID de tu proyecto Supabase.

     Por ejemplo: `https://qfoesitcsiuyswqlyegt.supabase.co/auth/v1/callback`

5. Haz clic en **"Crear"**
6. **GUARDA** el **Client ID** y **Client Secret** que se generan (los necesitarás en el siguiente paso)

---

## 🔧 Paso 2: Configurar Supabase

### 2.1 Habilitar Google como Proveedor de Autenticación

1. Ve a tu [Dashboard de Supabase](https://app.supabase.com/)
2. Selecciona tu proyecto
3. Ve a **"Authentication"** > **"Providers"**
4. Busca **"Google"** en la lista
5. Habilita el toggle de **"Google Enabled"**
6. Pega las credenciales de Google:
   - **Client ID**: El Client ID de Google Cloud
   - **Client Secret**: El Client Secret de Google Cloud
7. Haz clic en **"Save"**

### 2.2 Configurar Redirect URLs (Si usas dominio personalizado)

1. Ve a **"Authentication"** > **"URL Configuration"**
2. Agrega tus URLs de redirección:
   ```
   http://localhost:3000/dashboard
   https://tu-dominio.com/dashboard
   ```

---

## ✅ Paso 3: Probar la Integración

### 3.1 Probar Localmente

1. Asegúrate de que tu aplicación esté corriendo:

   ```bash
   npm run dev
   ```

2. Ve a `http://localhost:3000/login`

3. Haz clic en el botón **"Continuar con Google"** o **"Registrarse con Google"**

4. Serás redirigido a la página de autorización de Google

5. Autoriza la aplicación

6. Deberías ser redirigido de vuelta a `/dashboard` con tu sesión iniciada

### 3.2 Verificar el Usuario en Supabase

1. Ve a tu Dashboard de Supabase
2. Ve a **"Authentication"** > **"Users"**
3. Deberías ver tu nuevo usuario con el proveedor **"google"**
4. La tabla `app_users` también debería tener tu perfil creado automáticamente (gracias al trigger)

---

## 🐛 Solución de Problemas

### Error: "redirect_uri_mismatch"

**Causa**: La URI de redirección no coincide con las configuradas en Google Cloud.

**Solución**:

1. Verifica que la URL de callback en Google Cloud sea exactamente:
   ```
   https://<TU-PROYECTO>.supabase.co/auth/v1/callback
   ```
2. Asegúrate de haber guardado los cambios en Google Cloud Console

### Error: "Access blocked: This app's request is invalid"

**Causa**: La pantalla de consentimiento no está configurada correctamente.

**Solución**:

1. Completa todos los campos obligatorios en la pantalla de consentimiento
2. Verifica que el email de soporte sea válido
3. Si estás en modo "Testing", agrega tu email como usuario de prueba

### El usuario no aparece en `app_users`

**Causa**: El trigger no se ejecutó correctamente.

**Solución**:

1. Verifica que el trigger `handle_new_user` existe en tu base de datos
2. Ejecuta el script `db_schema.sql` nuevamente
3. Verifica los logs de Supabase en **"Database"** > **"Logs"**

### Error: "Invalid provider"

**Causa**: Google no está habilitado en Supabase.

**Solución**:

1. Ve a Supabase Dashboard > Authentication > Providers
2. Habilita Google y guarda las credenciales correctamente

---

## 📱 Consideraciones para Producción

### 1. Dominio Personalizado

Si usas un dominio personalizado, actualiza:

- **Google Cloud Console**: Orígenes autorizados
- **Supabase**: URL Configuration

### 2. Modo Producción en Google

Una vez que hayas probado todo:

1. Ve a Google Cloud Console > OAuth consent screen
2. Haz clic en **"Publicar aplicación"**
3. Esto permitirá que cualquier usuario con cuenta de Google pueda autenticarse

### 3. Seguridad

- **NUNCA** expongas tu `Client Secret` en el código del cliente
- Supabase maneja las credenciales de forma segura en el servidor
- Las credenciales de Google OAuth solo deben estar en el Dashboard de Supabase

---

## 🎉 ¡Listo!

Ahora tus usuarios pueden:

- ✅ Iniciar sesión con Google en un clic
- ✅ Registrarse con Google sin crear contraseña
- ✅ Tener su perfil creado automáticamente en `app_users`
- ✅ Acceder a todas las funcionalidades de BetTracker Pro

---

## 📚 Referencias

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Guía de Supabase para Google Sign-In](https://supabase.com/docs/guides/auth/social-login/auth-google)
