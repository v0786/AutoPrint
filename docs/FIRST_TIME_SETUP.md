# AutoPrint — First-Time Setup Guide

Welcome to AutoPrint! This guide walks you through what happens the very first time you launch AutoPrint on a computer, and how to set up your store owner account.

---

## The First-Time Experience at a Glance

When you set up AutoPrint on a new computer, the application guides you through a clean, automated setup flow:

```text
       Fresh PC / New Computer
                  │
                  ▼
        Run AutoPrint-Setup.exe
                  │
                  ▼
         Click [Install]
                  │
                  ▼
    AutoPrint Automatically Prepares:
    ✓ Private Runtime
    ✓ Local Database
    ✓ Print Management Engine
    ✓ Customer Upload Kiosk
    ✓ Merchant Management Desk
                  │
                  ▼
     AutoPrint Starts in System Tray
                  │
                  ▼
        Merchant Desk Opens
      (http://localhost:8000)
                  │
                  ▼
      ┌─────────────────────────┐
      │  WELCOME TO AUTOPRINT   │
      │  Print Shop System      │
      └───────────┬─────────────┘
                  │
                  ▼
            [Get Started]
                  │
                  ▼
      ┌─────────────────────────┐
      │ CREATE YOUR ACCOUNT     │
      │ • Full Name             │
      │ • Store Email           │
      │ • Username              │
      │ • Password              │
      └───────────┬─────────────┘
                  │
                  ▼
      ┌─────────────────────────┐
      │   REMEMBER THIS PC      │
      │   [✓] Stay signed in    │
      └───────────┬─────────────┘
                  │
                  ▼
      ┌─────────────────────────┐
      │       ALL SET! 🎉       │
      │   Setup is complete     │
      └───────────┬─────────────┘
                  │
                  ▼
     [Open Merchant Dashboard]
                  │
                  ▼
        Operational POS Screen
```

---

## Step 1: Running the Application

1. Double-click the **AutoPrint** shortcut on your Desktop or run `AutoPrint-Setup.exe`.
2. The installer automatically configures your application folders, secures file permissions, and sets up your private runtime.
3. No manual command-line commands, scripts, or external downloads are required.

---

## Step 2: Welcome Screen

When AutoPrint finishes starting, your web browser opens automatically to the Merchant Desk at:  
`http://localhost:8000`

Because this is a fresh installation with no store users created yet, you will see the **Welcome Page**:

```text
+-------------------------------------------------------------+
|                                                             |
|                          AUTOPRINT                          |
|             Welcome to your Print Shop System               |
|                                                             |
|   Let's set up your merchant account before you start       |
|   managing print jobs, printers, and daily collections.     |
|                                                             |
|                      [ Get Started → ]                      |
|                                                             |
+-------------------------------------------------------------+
```

Click **Get Started** to begin.

---

## Step 3: Create Your Administrator Account

Next, fill in your store details:

```text
+-------------------------------------------------------------+
|                                                             |
|                 Create Store Owner Account                  |
|                                                             |
|  Full Name:         [ Ramesh Sharma                       ] |
|  Store Email:       [ ramesh@autoprint.local              ] |
|  Username:          [ ramesh                              ] |
|  Password:          [ ••••••••••••                      👁 ] |
|  Confirm Password:  [ ••••••••••••                      👁 ] |
|                                                             |
|                     [ Continue → ]                          |
|                                                             |
+-------------------------------------------------------------+
```

### What you need to know:
- **Owner Account:** The first account created is automatically designated as the **Administrator / Store Owner**.
- **Password:** Must be at least 6 characters. Use a password you can remember or keep in a safe place.
- **Security:** Passwords are encrypted with cryptographic hashing. Plaintext passwords are never saved.

---

## Step 4: Remember This PC

On the next screen, choose whether this computer should remember your sign-in:

```text
+-------------------------------------------------------------+
|                                                             |
|                     Workstation Access                      |
|                                                             |
|  [✓] Remember this PC                                       |
|                                                             |
|      Keep this computer signed in so you don't need to     |
|      enter your password each time AutoPrint starts.       |
|                                                             |
|      Only use this on trusted shop computers behind the     |
|      counter.                                               |
|                                                             |
|                    [ Complete Setup ]                       |
|                                                             |
+-------------------------------------------------------------+
```

- **Checked (Default):** AutoPrint creates a secure session on this PC. You will jump straight into the Merchant Dashboard without logging in every day.
- **Unchecked:** Recommended only if this computer is shared with public customers or untrusted staff.

Click **Complete Setup**.

---

## Step 5: Setup Complete

AutoPrint confirms that your account and database are ready:

```text
+-------------------------------------------------------------+
|                                                             |
|                          ALL SET! 🎉                        |
|                                                             |
|  Your AutoPrint store account has been configured.          |
|                                                             |
|  Owner:        Ramesh Sharma                                |
|  Role:         Store Administrator                          |
|  Workstation:  Auto-Login Enabled                           |
|                                                             |
|               [ Open Merchant Dashboard → ]                 |
|                                                             |
+-------------------------------------------------------------+
```

Click **Open Merchant Dashboard**. You will land directly in your live AutoPrint management screen!

---

## What Happens on Future Starts?

On subsequent days:
1. Double-click the **AutoPrint** shortcut on your Desktop.
2. AutoPrint checks itself and starts all services in the background.
3. The Merchant Desk opens directly to your active dashboard—the initial welcome and account creation wizard will **never** show again.
4. If you chose "Remember this PC", you are signed in automatically and ready to process jobs immediately.
