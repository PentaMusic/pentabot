#!/bin/bash

# Cursor AI IDE Installation Script for Linux
# This script downloads, installs, and sets up Cursor IDE with desktop integration

set -e # Exit on error

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
RESET="\033[0m"

echo -e "${BOLD}${GREEN}===== Cursor AI IDE Installation Script =====${RESET}"
echo -e "This script will download and install Cursor AI IDE with desktop integration"
echo ""

# Determine current user home directory
USER_HOME="$HOME"
echo -e "${BLUE}User home directory: ${USER_HOME}${RESET}"

# Create necessary directories
echo -e "${BLUE}Creating necessary directories...${RESET}"
mkdir -p "${USER_HOME}/.local/share/cursor"
mkdir -p "${USER_HOME}/.local/share/applications"
mkdir -p "${USER_HOME}/.local/share/icons/hicolor/128x128/apps"
mkdir -p "${USER_HOME}/.local/bin"

# Download URL for Cursor AppImage
CURSOR_URL="https://downloader.cursor.sh/linux/appImage/x64"
APPIMAGE_PATH="${USER_HOME}/.local/share/cursor/cursor.AppImage"
TEMP_APPIMAGE="/tmp/cursor-latest.AppImage"

# Alternative download URLs (in case the main one fails)
ALT_URLS=(
    "https://download.cursor.sh/linux/appImage/x64"
    "https://cursor.sh/download/linux"
)

echo -e "${BLUE}Downloading Cursor AppImage...${RESET}"

# Try downloading from primary URL
download_success=false
if wget -q --show-progress -O "$TEMP_APPIMAGE" "$CURSOR_URL" 2>/dev/null; then
    download_success=true
    echo -e "${GREEN}Download successful from primary URL${RESET}"
else
    echo -e "${YELLOW}Primary download failed, trying alternative methods...${RESET}"
    
    # Try alternative URLs
    for url in "${ALT_URLS[@]}"; do
        echo -e "${BLUE}Trying: $url${RESET}"
        if wget -q --show-progress -O "$TEMP_APPIMAGE" "$url" 2>/dev/null; then
            download_success=true
            echo -e "${GREEN}Download successful from alternative URL${RESET}"
            break
        fi
    done
fi

# If all downloads failed, provide manual instructions
if [ "$download_success" = false ]; then
    echo -e "${RED}Automatic download failed. Please download manually:${RESET}"
    echo -e "${YELLOW}1. Visit https://cursor.com/downloads${RESET}"
    echo -e "${YELLOW}2. Download the Linux AppImage${RESET}"
    echo -e "${YELLOW}3. Save it as cursor-latest.AppImage in /tmp/${RESET}"
    echo -e "${YELLOW}4. Run this script again${RESET}"
    
    # Check if user has manually downloaded the file
    if [ ! -f "$TEMP_APPIMAGE" ]; then
        echo -e "${RED}Please download the AppImage manually and try again.${RESET}"
        exit 1
    else
        echo -e "${GREEN}Found manually downloaded AppImage, continuing...${RESET}"
    fi
fi

# Verify the downloaded file is valid
if [ ! -f "$TEMP_APPIMAGE" ] || [ ! -s "$TEMP_APPIMAGE" ]; then
    echo -e "${RED}Downloaded file is invalid or empty. Please try again.${RESET}"
    exit 1
fi

# Install the AppImage
echo -e "${BLUE}Installing Cursor AppImage...${RESET}"
cp "$TEMP_APPIMAGE" "$APPIMAGE_PATH"
chmod +x "$APPIMAGE_PATH"

# Create symbolic link in ~/.local/bin for command line access
echo -e "${BLUE}Creating command-line launcher...${RESET}"
ln -sf "$APPIMAGE_PATH" "${USER_HOME}/.local/bin/cursor"

# Ensure PATH includes ~/.local/bin
if ! echo "$PATH" | grep -q "${USER_HOME}/.local/bin"; then
    echo -e "${BLUE}Adding ~/.local/bin to PATH...${RESET}"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    
    # Also add to other shell configs if they exist
    [ -f "$HOME/.zshrc" ] && echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
    [ -f "$HOME/.fish/config.fish" ] && echo 'set -gx PATH $HOME/.local/bin $PATH' >> "$HOME/.fish/config.fish"
fi

# Download Cursor icon
echo -e "${BLUE}Downloading Cursor icon...${RESET}"
ICON_PATH="${USER_HOME}/.local/share/icons/hicolor/128x128/apps/cursor.png"
ICON_URLS=(
    "https://cursor.com/favicon.ico"
    "https://avatars.githubusercontent.com/u/151070299?s=200&v=4"
    "https://raw.githubusercontent.com/getcursor/cursor/main/assets/icon.png"
)

icon_downloaded=false
for icon_url in "${ICON_URLS[@]}"; do
    if wget -q -O "$ICON_PATH" "$icon_url" 2>/dev/null; then
        icon_downloaded=true
        echo -e "${GREEN}Icon downloaded successfully${RESET}"
        break
    fi
done

if [ "$icon_downloaded" = false ]; then
    echo -e "${YELLOW}Could not download icon, using default${RESET}"
    # Create a simple text-based icon as fallback
    echo "Cursor" > "$ICON_PATH"
fi

# Create desktop entry
echo -e "${BLUE}Creating desktop entry...${RESET}"
cat > "${USER_HOME}/.local/share/applications/cursor.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Cursor
GenericName=AI Code Editor
Comment=The AI-first Code Editor built for pair programming
Exec=${APPIMAGE_PATH} %F
TryExec=${APPIMAGE_PATH}
Icon=${ICON_PATH}
Terminal=false
Categories=Development;IDE;TextEditor;
MimeType=text/plain;inode/directory;
Keywords=cursor;code;editor;ai;development;programming;
StartupWMClass=Cursor
EOF

chmod +x "${USER_HOME}/.local/share/applications/cursor.desktop"

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
    echo -e "${BLUE}Updating desktop database...${RESET}"
    update-desktop-database "${USER_HOME}/.local/share/applications" 2>/dev/null || true
fi

# Create update script
echo -e "${BLUE}Creating update script...${RESET}"
cat > "${USER_HOME}/.local/share/cursor/update-cursor.sh" << 'EOF'
#!/bin/bash

# Cursor Update Script
echo "Checking for Cursor updates..."

CURSOR_DIR="$HOME/.local/share/cursor"
APPIMAGE_PATH="$CURSOR_DIR/cursor.AppImage"
TEMP_FILE="/tmp/cursor-update.AppImage"
DOWNLOAD_URL="https://downloader.cursor.sh/linux/appImage/x64"

# Download latest version
if wget -q --show-progress -O "$TEMP_FILE" "$DOWNLOAD_URL"; then
    # Check if it's different from current version
    if [ -f "$APPIMAGE_PATH" ]; then
        if ! cmp -s "$TEMP_FILE" "$APPIMAGE_PATH"; then
            echo "New version found! Updating..."
            chmod +x "$TEMP_FILE"
            mv "$TEMP_FILE" "$APPIMAGE_PATH"
            echo "Cursor updated successfully!"
        else
            echo "Cursor is already up to date."
            rm "$TEMP_FILE"
        fi
    else
        echo "Installing Cursor..."
        chmod +x "$TEMP_FILE"
        mv "$TEMP_FILE" "$APPIMAGE_PATH"
        echo "Cursor installed successfully!"
    fi
else
    echo "Failed to download update. Please check your internet connection."
    exit 1
fi
EOF

chmod +x "${USER_HOME}/.local/share/cursor/update-cursor.sh"

# Clean up
echo -e "${BLUE}Cleaning up temporary files...${RESET}"
rm -f "$TEMP_APPIMAGE"

# Final instructions
echo -e "${BOLD}${GREEN}===== Installation Complete! =====${RESET}"
echo -e "${GREEN}Cursor AI IDE has been successfully installed!${RESET}"
echo ""
echo -e "${BOLD}How to use:${RESET}"
echo -e "• ${BLUE}From GUI:${RESET} Find 'Cursor' in your applications menu"
echo -e "• ${BLUE}From Terminal:${RESET} Type 'cursor' (restart terminal first)"
echo -e "• ${BLUE}Update:${RESET} Run '${USER_HOME}/.local/share/cursor/update-cursor.sh'"
echo ""
echo -e "${BOLD}Next steps:${RESET}"
echo -e "1. Restart your terminal or run: ${YELLOW}source ~/.bashrc${RESET}"
echo -e "2. Launch Cursor and sign in to access AI features"
echo -e "3. Import your VS Code settings if desired"
echo ""
echo -e "${BOLD}${GREEN}Happy coding with Cursor AI! 🚀${RESET}"