# 🎨 Signature Studio Pro

A professional digital signature creator with advanced drawing tools, layer management, and customization options.

![Signature Studio](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/react-19.2.1-61dafb.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.8.2-blue.svg)

## ✨ Features

- 🖊️ **Advanced Drawing Tools** - Pen, brush, monoline with physics-based rendering
- 🎨 **Layer Management** - Multiple ink and text layers with full control
- ⚡ **Real-time Canvas** - Smooth, responsive drawing experience
- 🎭 **Custom Fonts** - Beautiful signature fonts built-in
- 🎯 **Grid & Snap** - Precision tools for perfect alignment
- 📦 **Export Options** - Download as PNG with customizable backgrounds
- ↩️ **Undo/Redo** - Full history management (30 steps)
- 📱 **Responsive** - Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd signature-studio

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## 🌐 Deploy to Vercel

### Option 1: CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Add New" → "Project"
4. Import your repository
5. Click "Deploy"

Vercel auto-detects Vite configuration - no manual setup needed!

## 📋 Error Logging System

This app includes **White House grade error logging** with unique error IDs for debugging:

### Error ID Format
```
[LEVEL ERROR_ID] [CODE] Message
Example: [ERROR SIG-1735849200000-A7X9K] [RENDER_001] Canvas ref is null during render
```

### Error Categories

| Code Prefix | Category | Description |
|-------------|----------|-------------|
| `INIT-xxx` | Initialization | Canvas and app setup errors |
| `RENDER-xxx` | Rendering | Canvas drawing and layer rendering |
| `DRAW-xxx` | Drawing | User input and stroke creation |
| `LAYER-xxx` | Layer Management | Layer operations |
| `HISTORY-xxx` | History | Undo/redo operations |
| `TEXT-xxx` | Text | Text layer operations |
| `EXPORT-xxx` | Export | Download and export operations |
| `INPUT-xxx` | Input | Coordinate and event handling |
| `TOOL-xxx` | Tools | Tool switching |
| `COLOR-xxx` | Color | Color selection |
| `PHYSICS-xxx` | Physics | Stroke physics settings |
| `GRID-xxx` | Grid | Grid configuration |
| `BG-xxx` | Background | Background settings |
| `TRIM-xxx` | Trim | Auto-trim toggle |

### Using Error Logs

1. Open browser DevTools (F12)
2. Go to Console tab
3. Filter by error level: `[ERROR]`, `[WARN]`, `[INFO]`
4. Copy the full error ID for bug reports

Example error report:
```
Error ID: SIG-1735849200000-A7X9K
Code: RENDER_001
Message: Canvas ref is null during render
Component: SignatureMaker
Action: Rendering layers
```

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **HTML5 Canvas** - Drawing engine

## 📁 Project Structure

```
signature-studio/
├── src/
│   ├── components/
│   │   └── SignatureMaker.tsx    # Main component with logging
│   ├── App.tsx                    # App wrapper
│   └── index.tsx                  # Entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## 🎯 Development

### Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

### Console Logging Levels

```typescript
logInfo('CODE', 'message', context)    // General information
logWarning('CODE', 'message', context) // Warnings
logError('CODE', 'message', context)   // Errors
```

## 🐛 Debugging Tips

1. **Canvas not rendering?** Check console for `INIT-xxx` or `RENDER-xxx` errors
2. **Drawing not working?** Look for `DRAW-xxx` or `INPUT-xxx` errors
3. **Undo/redo broken?** Check `HISTORY-xxx` logs
4. **Export failing?** Review `EXPORT-xxx` errors

All errors include unique IDs and context for easy debugging!

## 📝 License

MIT License - feel free to use this project however you'd like!

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit with descriptive messages
4. Submit a pull request

## 📞 Support

For issues or questions, please use the error ID from console logs when reporting bugs.

---

Made with ❤️ using React + TypeScript + Vite
