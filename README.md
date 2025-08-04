# Cursor AI IDE - Linux Installation Guide

This guide provides multiple methods to download and install Cursor AI IDE on Linux systems.

## 🚀 Quick Installation (Recommended)

### Method 1: Automated Installation Script

Run this one-liner to automatically download, install, and set up Cursor:

```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/install_cursor.sh | bash
```

Or download and run the script manually:

```bash
wget https://raw.githubusercontent.com/your-repo/install_cursor.sh
chmod +x install_cursor.sh
./install_cursor.sh
```

### Method 2: Manual Installation

1. **Install dependencies** (required for AppImages):
   ```bash
   sudo apt install libfuse2  # Ubuntu/Debian
   sudo dnf install fuse-libs # Fedora
   sudo pacman -S fuse2       # Arch Linux
   ```

2. **Download Cursor AppImage**:
   ```bash
   wget -O cursor.AppImage "https://downloader.cursor.sh/linux/appImage/x64"
   chmod +x cursor.AppImage
   ```

3. **Run Cursor**:
   ```bash
   ./cursor.AppImage
   ```

## 🔧 Installation Options

### Official Download Sources

- **Primary**: https://cursor.com/downloads
- **Direct AppImage**: https://downloader.cursor.sh/linux/appImage/x64
- **Alternative**: https://cursor.sh/

### System Requirements

- **OS**: Modern Linux distribution (64-bit)
- **RAM**: 4 GB minimum (8 GB+ recommended)
- **Storage**: 1-2 GB free space
- **Network**: Internet connection for AI features

## 🖥️ Desktop Integration

The installation script automatically creates:

- **Desktop entry** for application menu
- **Command-line access** via `cursor` command
- **File associations** for code files
- **Auto-updater script**

### Manual Desktop Entry

If you need to create a desktop entry manually:

```bash
cat > ~/.local/share/applications/cursor.desktop << EOF
[Desktop Entry]
Type=Application
Name=Cursor
Comment=AI-first Code Editor
Exec=/path/to/cursor.AppImage %F
Icon=/path/to/cursor-icon.png
Terminal=false
Categories=Development;IDE;TextEditor;
EOF
```

## 🔄 Updating Cursor

### Using the Auto-Update Script

If you used the installation script, update with:

```bash
~/.local/share/cursor/update-cursor.sh
```

### Manual Update

1. Download the latest AppImage
2. Replace the old one
3. Ensure executable permissions

## 🐛 Troubleshooting

### Common Issues

**AppImage won't run:**
```bash
# Install FUSE library
sudo apt install libfuse2

# Or run with --no-sandbox flag
./cursor.AppImage --no-sandbox
```

**Permission denied:**
```bash
chmod +x cursor.AppImage
```

**Command not found (cursor):**
```bash
# Add to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Download fails:**
- Check internet connection
- Try alternative download URLs
- Download manually from https://cursor.com/downloads

### Log Files

Check logs if Cursor doesn't start:
```bash
~/.config/Cursor/logs/
```

## 🌟 Features

- **AI Pair Programming**: Built-in AI assistant
- **VS Code Compatible**: Import extensions and settings
- **Real-time Collaboration**: Share coding sessions
- **Multiple AI Models**: GPT-4, Claude, and more
- **Code Generation**: Natural language to code
- **Intelligent Completions**: Context-aware suggestions

## 📚 Getting Started

1. **Launch Cursor** from applications menu or terminal
2. **Sign in** to access AI features
3. **Import settings** from VS Code (optional)
4. **Create or open** a project
5. **Start coding** with AI assistance!

## 🔗 Useful Links

- **Official Website**: https://cursor.com/
- **Documentation**: https://docs.cursor.com/
- **Community Forum**: https://forum.cursor.com/
- **GitHub**: https://github.com/getcursor/cursor
- **Discord**: https://discord.gg/cursor

## 📄 License

Cursor AI IDE is proprietary software. Check the official website for license terms.

---

**Happy coding with Cursor AI! 🚀**