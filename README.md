# QRPrint

QRPrint helps a print shop take document-printing orders. Store staff use the
merchant app to manage orders and printers; customers can use the customer web
page to submit a print request.

You do not need programming experience to install the merchant app. Follow the
steps below in order.

## Before you begin

You will need:

- A Windows 10 or Windows 11 computer
- An internet connection for the first installation
- A printer connected to the computer and working in Windows
- About 2 GB of free disk space

The installer also needs **Node.js**. If it is not already installed, download
the **LTS** version from [nodejs.org](https://nodejs.org/en/download), install
it using the default options, then restart your computer before continuing.

## Install QRPrint

1. Download or copy the complete QRPrint project folder to your computer.
2. Open that folder in File Explorer.
3. Right-click `installer.bat` and choose **Run as administrator**.
4. If Windows asks for permission, choose **Yes**.
5. Keep the installer window open until it says **Installation Complete**. The
   first installation may take several minutes.

If the window closes or shows an error, take a screenshot of the message before
trying again. The most common cause is missing Node.js or a lost internet
connection.

## Start the merchant app

After installation:

1. Open the QRPrint project folder.
2. Click the address bar at the top of File Explorer, type `cmd`, and press
   Enter. A black Command Prompt window will open already in the right folder.
3. Copy and paste the following two lines, pressing Enter after each one:

```cmd
cd merchant
npm run electron
```

4. Leave the black window open while you use QRPrint. Closing it stops the app.

On the first launch, complete the on-screen setup: sign in as the local
administrator, enter your business details, and choose the printer you want to
use. QRPrint saves these settings on that computer.

## Everyday use

1. Open the merchant app.
2. Check the incoming order list.
3. Review the customer's file and chosen print options.
4. Confirm payment (cash or UPI, as applicable).
5. Print the order and update its status in the app.

Supported customer file types include PDF, Word (`.docx`), PowerPoint
(`.pptx`), Excel (`.xlsx` or `.xls`), and JPG images.

## Customer web page

The customer page is a separate website, maintained in the repository's
`customer` branch. It needs to be deployed and connected to the shop computer
before customers outside the store can submit orders.

## About `install.bat`

`install.bat` prepares a Python environment for future QRPrint utilities. Most
users do not need to run it for the merchant application; use `installer.bat`
for the normal QRPrint installation.

## Need more help?

The detailed setup, customer website deployment, and troubleshooting guide is
available in [INSTALL_AND_USE.md](INSTALL_AND_USE.md). If you need technical
help, share the exact error message and a screenshot with your support person.
