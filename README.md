# Free To Smoke - Customer Management System

A modern React-based customer management system with Firebase backend, featuring user registration, authentication, and admin panel.

## 🚀 Features

- **User Registration & Authentication**: Secure user signup and login
- **Admin Panel**: Administrative interface for user management
- **Security**: CSRF protection, input sanitization, rate limiting
- **Testing**: Jest test suite with coverage reporting
- **Modern UI**: Responsive design with Tailwind CSS
- **Firebase Integration**: Firestore database and authentication

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore enabled
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

## 🏃‍♂️ Development

1. **Start development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173)

2. **Run tests**
   ```bash
   npm test
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

## 🚀 Production Deployment

### Prerequisites for Production

1. **Create production Firebase project**
2. **Configure Firestore security rules** (already configured in `firestore.rules`)
3. **Set up production environment variables**

### Deployment Steps

#### Option 1: Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Configure environment variables in Vercel dashboard**
   - Add all variables from `.env.production`
   - Ensure `VITE_ENVIRONMENT=production`

#### Option 2: Firebase Hosting

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login and initialize**
   ```bash
   firebase login
   firebase init hosting
   ```

3. **Build and deploy**
   ```bash
   npm run build
   firebase deploy
   ```

### Production Configuration

1. **Create `.env.production`**
   ```env
   VITE_FIREBASE_API_KEY=your-production-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-production-domain
   VITE_FIREBASE_PROJECT_ID=your-production-project
   VITE_ENVIRONMENT=production
   VITE_DEBUG_MODE=false
   VITE_ADMIN_EMAIL=admin@yourcompany.com
   VITE_ADMIN_PASSWORD=SECURE_PASSWORD_HERE
   ```

2. **Update Firestore Security Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Verify security configuration**
   - Check that development rules are replaced
   - Test authentication flows
   - Verify admin access controls

## 🔒 Security Checklist

### Before Production Deployment

- [ ] Replace development Firebase keys with production keys
- [ ] Change default admin password in `.env.production`
- [ ] Deploy production Firestore security rules
- [ ] Enable rate limiting in production
- [ ] Verify HTTPS is enforced
- [ ] Test all authentication flows
- [ ] Run security audit: `npm audit`

### Post-Deployment

- [ ] Monitor Firebase console for unusual activity
- [ ] Set up Firebase security alerts
- [ ] Configure backup strategies
- [ ] Monitor application logs

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test simple.test.tsx
```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── HomePage.tsx     # Landing page
│   ├── Registration.tsx # User registration
│   ├── Login.tsx        # User login
│   ├── AdminPanel.tsx   # Admin interface
│   └── __tests__/       # Component tests
├── utils/               # Utility functions
│   ├── firebase.ts      # Firebase configuration
│   ├── security.ts      # Security utilities
│   ├── auth.ts          # Authentication helpers
│   └── storage.ts       # Data storage utilities
├── types/               # TypeScript type definitions
└── styles/              # CSS and styling
```

## 🔧 Configuration Files

- `firebase.json` - Firebase hosting and Firestore configuration
- `firestore.rules` - Database security rules
- `vercel.json` - Vercel deployment configuration
- `jest.config.js` - Testing configuration
- `vite.config.ts` - Build tool configuration

## 🐛 Troubleshooting

### Common Issues

1. **Firebase connection errors**
   - Verify API keys in environment variables
   - Check Firebase project configuration
   - Ensure Firestore is enabled

2. **Build failures**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check for TypeScript errors: `npm run type-check`

3. **Test failures**
   - Ensure all dependencies are installed
   - Check Jest configuration in `jest.config.js`

### Performance Optimization

- Bundle size is currently ~1MB - consider code splitting
- Implement lazy loading for admin components
- Optimize images and assets
- Enable gzip compression on server

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For support and questions, please contact the development team.