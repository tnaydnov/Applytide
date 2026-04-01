# 🌊 Applytide

> **Enterprise-grade job application tracking platform**

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the app.

---

## 📚 Documentation

See the root-level **[ARCHITECTURE.md](../ARCHITECTURE.md)** for full system design and structure.

---

## 🎨 Design System

**TideLayersPlumEnhanced** - Futuristic tech aesthetic with:

- 🎨 **Colors**: Dark blue-gray (#383e4e), Light silver-gray (#b6bac5), Warm plum (#9F5F80)
- 🌊 **Animated wave backgrounds**
- ✨ **Glass morphism effects**
- 🔄 **3D tilt interactions**
- 🌍 **Multi-language support** (English/Hebrew with RTL)

---

## 🚀 Features

- 📝 Job application tracking
- 🔔 Interview reminders
- 📊 Analytics dashboard
- 🌐 Chrome extension integration
- 📧 Email notifications
- 🔍 AI-powered insights
- 📱 Mobile-responsive design
- 🌏 Internationalization (i18n)

---

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS v4
- **Animation**: Motion (Framer Motion)
- **Forms**: React Hook Form + Zod
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Build Tool**: Vite

---

## 📁 Project Structure

```
applytide/
├── components/      # Reusable UI components
├── pages/           # Page components (routes)
├── hooks/           # Custom React hooks
├── contexts/        # Global state management
├── utils/           # Helper functions & translations
├── constants/       # Static data & configuration
├── features/        # Feature modules (api, hooks, types)
├── types/           # TypeScript type definitions
├── layouts/         # Page layouts
├── styles/          # Global CSS & Tailwind config
├── docs/            # 📚 All documentation
└── App.tsx          # Root component
```

---

## 🌍 Language Support

The app supports **English** and **Hebrew** with proper RTL support:

```typescript
import { useLanguage } from './contexts/LanguageContext';

const { language, setLanguage, t } = useLanguage();
```

---

## 🔐 Authentication

Authentication flow includes:
- Sign In
- Sign Up
- Forgot Password
- Reset Password
- Email verification

---

## 📧 Email Templates

Email templates are managed by the backend email service in `backend/emails/templates/`:
- Welcome emails
- Password reset
- Application reminders
- Interview notifications

---

## 🧪 Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Environment Variables

Create `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Applytide
```

### Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
```

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write tests if applicable
4. Submit a pull request

---

## 📄 License

See [Attributions.md](./Attributions.md) for license information.

---

## 📞 Support

- **Documentation**: [/docs](./docs)
- **Email**: support@localhost
- **Website**: http://localhost

---

<div align="center">

**Built with ❤️ by the Applytide Team**

</div>
