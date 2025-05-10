# Steam Item NameID Scraper

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)  
![Node.js CI](https://img.shields.io/badge/Node.js-%3E%3D14.0.0-brightgreen.svg)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

A Puppeteer-based scraper that logs into Steam, navigates the Community Market for a specified game, and extracts each listing’s internal `item_nameid`.  
These IDs can be used with Steam’s public API to fetch price data, market activity, and more.

---

## Features

- **Automatic Login**  
  Authenticate with Steam using stored credentials.  
- **Configurable Target**  
  Specify any Steam AppID in `settings.json` to scrape different games.  
- **Pagination Handling**  
  Automatically detect and iterate through all market pages.  
- **CSV Output**  
  Appends each record with `hash_name` in column 1 and `item_nameid` in column 2 to a CSV file for easy analysis.

---

## Prerequisites

- **Node.js** v14.0.0 or higher  
- **npm** (bundled with Node.js)  
- A valid Steam account

---

## Installation

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-username/steam-item-nameid-scraper.git
   cd steam-item-nameid-scraper

## Configuration
**Edit `settings.json`** to set your target game id and file output options
    ```json
    {
        "appId": "730",
        "outputFolder": "output",
        "parallelTabs": 10
    }

⚠️ WARNING: Increasing parallelTabs speeds things up, but setting the
value too high can exhaust Chromium’s memory and crash the browser.

---

## Usage

### 1. First‑time setup (all platforms)

```bash
# inside the project folder run
main.bat
```
A Chrome window launches via Puppeteer so you can log in visually.

Enter your Steam username and password when prompted. They are saved to login_info.json, so future runs skip the prompt unless you delete the file.

If Steam Guard 2‑factor authentication is enabled, approve the sign‑in on your mobile authenticator.



## 🤝 Contributing

Contributions are welcome! Feel free to:
- Open issues for bugs or feature requests
- Submit pull requests to improve the code
- Share your feedback and ideas

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.