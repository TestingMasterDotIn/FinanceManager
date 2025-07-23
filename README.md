# 🏦 FinanceManager - Smart Loan & Debt Management App

A comprehensive loan management application built with React, TypeScript, Vite, and Supabase. Track multiple loans, simulate prepayments, visualize debt analytics, and get AI-powered optimization suggestions.

## ✨ Features

- 🏠 **Beautiful Landing Page** with smooth animations and dark/light mode
- 🔐 **Secure Authentication** with Supabase Auth
- 💼 **Multi-Loan Management** - Add, edit, and track multiple loans
- 📊 **Advanced Analytics** - Interactive charts and debt visualizations
- 🧠 **AI-Powered Optimization** - Generate personalized debt repayment strategies
- 📱 **Responsive Design** - Works perfectly on all devices
- 🎨 **Modern UI** - Clean, professional design with smooth animations

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Icons**: Heroicons
- **Routing**: React Router DOM

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd loan-management-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the database migrations in your Supabase project using the SQL in `supabase/migrations/`

6. Start the development server:
```bash
npm run dev
```

## 📊 Key Features

### Loan Management
- Add multiple loan types (Home, Personal, Car, Education, Business)
- Automatic EMI calculation
- Track loan details and payment schedules
- Edit and delete loans

### Analytics Dashboard
- Visual debt distribution with pie charts
- EMI comparison across loans
- Track total outstanding balance
- Monthly payment breakdowns

### AI Optimization Assistant
- Generate personalized debt repayment strategies
- Export AI prompts for ChatGPT/Claude
- Consider prepayment scenarios
- Loan snowball vs avalanche recommendations

### Prepayment Simulation
- One-time and recurring prepayments
- Interest rate change scenarios
- Calculate savings and reduced tenure
- Visual impact on debt journey

## 🔧 Database Schema

The app uses three main tables:

- **loans**: Store loan details and EMI information
- **prepayments**: Track prepayment scenarios
- **rate_changes**: Handle interest rate modifications

All tables include Row Level Security (RLS) policies to ensure data privacy.

## 🎨 Design Features

- **Dark/Light Mode**: Automatic theme switching with persistence
- **Responsive Layout**: Mobile-first design approach
- **Smooth Animations**: Framer Motion for enhanced UX
- **Modern UI**: Clean cards, gradients, and professional styling
- **Interactive Charts**: Beautiful data visualizations

## 📱 Mobile Optimization

- Touch-friendly interface
- Responsive breakpoints
- Optimized navigation
- Fast loading times

## 🔒 Security

- Supabase authentication
- Row Level Security (RLS)
- Secure API endpoints
- Data validation

## 🚀 Deployment

The app can be deployed to:
- Vercel (recommended)
- Netlify
- Any static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 💡 Future Enhancements

- [ ] Advanced prepayment strategies
- [ ] Email notifications for EMI reminders
- [ ] PDF report generation
- [ ] Loan comparison tools
- [ ] Integration with banking APIs
- [ ] Progressive Web App (PWA) features

## 🐛 Bug Reports

If you find any bugs, please create an issue on GitHub with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)

## 🌟 Support

If you find this project helpful, please give it a ⭐ on GitHub!