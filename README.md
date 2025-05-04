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
- **JSON Output**  
  Appends each record as `{ hash_name, item_nameid }` to a JSON file for easy analysis.

---

## Prerequisites

- **Node.js** v14.0.0 or higher  
- **npm** (bundled with Node.js)  
- A valid Steam account with Market access

---

## Installation

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-username/steam-item-nameid-scraper.git
   cd steam-item-nameid-scraper

## Configuration

1. **Add steam credentials to `LoginInfo.json`** in the project root  
   ```json
   {
     "username": "YOUR_STEAM_USERNAME",
     "password": "YOUR_STEAM_PASSWORD"
   }
2. **Edit `settings.json`** to set your target game id and file output options
    ```json
    {
        "appId": "730",            // Example: 730 = CS2
        "outputFile": "items.json" // Default output filename
    }

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Open issues for bugs or feature requests
- Submit pull requests to improve the code
- Share your feedback and ideas

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.