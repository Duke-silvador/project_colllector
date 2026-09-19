import { jsPDF } from "jspdf";
import fs from "fs";

console.log("🚀 Starting programmatical generation of COMPLETE SOFTWARE PROJECT DOCUMENTATION PDF...");

// Initialize jsPDF in portrait A4 size
const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4"
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 20;
const contentWidth = pageWidth - (margin * 2);

// Colors (Consistent with the store's luxury navy and gold brand identity)
const colorPrimary = [24, 43, 73];    // Deep Navy Blue
const colorAccent = [197, 160, 89];   // Metallic Gold
const colorCharcoal = [40, 44, 52];    // Charcoal body text
const colorMuted = [120, 125, 135];    // Muted grey

let currentPageNum = 1;

// Function to draw Header on every page (except the title cover page)
function drawPageHeader(doc, pageNum) {
  if (pageNum === 1) return; // Skip cover page
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.text("SRI LAKSHMI SAIRAM FANCY STORE - BILLING SYSTEM", margin, 12);
  
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text("TECHNICAL REFERENCE MANUAL", pageWidth - margin - 50, 12);
  
  // Header accent line
  doc.setDrawColor(colorAccent[0], colorAccent[1], colorAccent[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, 14, pageWidth - margin, 14);
}

// Function to draw Footer on every page
function drawPageFooter(doc, pageNum) {
  // Footer rule
  doc.setDrawColor(220, 222, 225);
  doc.setLineWidth(0.2);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(colorMuted[0], colorMuted[1], colorMuted[2]);
  doc.text("Confidential - For Internal Store Operations & Engineering Reference Only", margin, pageHeight - 10);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 10);
}

// Content Structure representing all requested 24 chapters
const chapters = [
  {
    title: "1. PROJECT OVERVIEW",
    sections: [
      {
        subtitle: "Project Name & Identity",
        paragraphs: [
          "Project Name: Sri Lakshmi Sairam Fancy Store Billing System.",
          "Target Store: Sri Lakshmi Sairam Fancy Store, Thotavari St, JD Nagar, Patamata, Benz Circle, Vijayawada, Andhra Pradesh 520010.",
          "Proprietor / Key Stakeholder: Siva Kumar (+91 8143102456)."
        ]
      },
      {
        subtitle: "Operational Challenges & Purpose",
        paragraphs: [
          "Siva Kumar previously operated the fancy store using a manual ledger book system. Due to high volumes of small accessories, checkouts during festivals were sluggish, inventory discrepancies were frequent, and customer purchasing history was untracked. This project introduces a digital Point-of-Sale (POS) system specifically optimized for fancy retail, providing sub-second calculations, automatic offline data buffering, live cloud synchronization, and digital receipt sharing."
        ]
      },
      {
        subtitle: "Core Objectives",
        paragraphs: [
          "• Real-time high-fidelity billing with customizable, item-specific discounts.",
          "• Offline-first design to operate seamlessly inside concrete-shielded market stalls.",
          "• Automatic multi-device syncing via Google Firebase Firestore.",
          "• In-app barcode generation and direct thermal roll spool printing.",
          "• Instant PDF invoice creation with clickable digital branding card hyperlinks."
        ]
      }
    ]
  },
  {
    title: "2. SYSTEM ARCHITECTURE",
    sections: [
      {
        subtitle: "Architecture Overview",
        paragraphs: [
          "The system utilizes a modern full-stack Single Page Application (SPA) architecture designed to transition into a native Android app via Capacitor wrapper modules. The architectural stack consists of four key components: Reactive UI State, Local Web Storage, Firebase SDK Offline Persistent Cache, and the Cloud Database."
        ]
      },
      {
        subtitle: "Component Interaction Flow",
        paragraphs: [
          "1. Product Discovery: The scanner retrieves optical inputs and decodes barcodes into string SKU keys. The UI queries the synchronized memory cache to locate item documents.",
          "2. Sales Transactions: Transactions are compiled locally as a 'Bill' schema, written to LocalStorage, and queued inside Firestore's background write engine. The app then compiles a jsPDF blob and generates a WhatsApp URI.",
          "3. Background Synchronization: The Firebase offline persistent layer monitors network availability. On connection, it dispatches queued batches to the cloud. Other linked terminals receive real-time snapshot events to stay synchronized."
        ]
      }
    ]
  },
  {
    title: "3. TECHNOLOGY STACK",
    sections: [
      {
        subtitle: "Frontend Technologies",
        paragraphs: [
          "• React (v19.0.1): Component-driven structure, optimized state rendering, and custom hooks.",
          "• TypeScript (v5.8.2): Provides strict compile-time types, interface contracts, and eliminates runtime exceptions.",
          "• Tailwind CSS (v4.1.14): Light-weight responsive styling classes, and standard layout attributes.",
          "• Motion (v12.23.24): Smooth route and interface transitions for a native feel."
        ]
      },
      {
        subtitle: "Native Integration & Print Utilities",
        paragraphs: [
          "• Capacitor Core & Android (v8.4.1): Wraps the web application into an Android APK, providing access to hardware APIs.",
          "• jsPDF (v4.2.1): Generates pixel-perfect A4 bills client-side, with embedded high-resolution fonts and clickable maps/social links.",
          "• JsBarcode (v3.12.3): Generates clean Code-128 barcode SVGs dynamically.",
          "• html5-qrcode (v2.3.8): Captures and processes high-speed camera streams to decode barcodes instantly."
        ]
      }
    ]
  },
  {
    title: "4. COMPLETE FOLDER STRUCTURE",
    sections: [
      {
        subtitle: "Workspace Directory Layout",
        paragraphs: [
          "The repository follows an organized clean architecture pattern to separate models, controllers, and screens:",
          "• src/types.ts: Explicit TypeScript interfaces for Bills, Products, Customers, and Settings.",
          "• src/initialData.ts: Default configurations and emergency backup catalogs.",
          "• src/lib/firebase.ts: Contains database connections, backup helpers, and cleanup routines.",
          "• src/lib/pdfHelper.ts: Formats and generates professional customer PDF invoices.",
          "• src/lib/whatsappHelper.ts: Creates formatted text summary receipts for WhatsApp.",
          "• src/components/: Reusable modular screen components.",
          "  - NewBillScreen.tsx: Handles sales registers, search utilities, and cash checkouts.",
          "  - ProductsScreen.tsx: Inventory control screen.",
          "  - DashboardScreen.tsx: Visual analytics and sales charts.",
          "  - BarcodeCenter.tsx: Reprinting labels and configuring printers.",
          "  - SettingsScreen.tsx: Production-hardened configurations."
        ]
      }
    ]
  },
  {
    title: "5. SOURCE CODE ANALYSIS",
    sections: [
      {
        subtitle: "src/App.tsx Controller",
        paragraphs: [
          "This is the core manager of the application. It manages session context (Owner/Staff), coordinates view navigation tabs, initializes Firebase listeners, handles local backups, and executes product-wise synchronization.",
          "State Variables: activeTab ('Dashboard'|'Billing'|'Inventory'|'History'|'Settings'), session (UserSession), products (Product[]), bills (Bill[]), customers (Customer[]), settings (StoreSettings)."
        ]
      },
      {
        subtitle: "src/lib/firebase.ts Database Adapter",
        paragraphs: [
          "Provides the interface to Firestore, setting up offline persistent caching and handling snapshot database updates.",
          "Key Functions: saveProductToCloud(), saveBillToCloud(), saveCustomerToCloud(), generateDailyReports(), cleanupFirestoreTestRecords()."
        ]
      }
    ]
  },
  {
    title: "6. IMPORT ANALYSIS",
    sections: [
      {
        subtitle: "Core Package Imports",
        paragraphs: [
          "• react & react-dom: Component tree structure and DOM bindings.",
          "• firebase/app & firebase/firestore: Handles cloud connections, data models, and queries.",
          "• jspdf: Direct client-side generation of high-resolution PDF invoices.",
          "• jsbarcode: Direct generation of Code-128 vector bars.",
          "• html5-qrcode: Connects the camera stream to decode scanned items."
        ]
      }
    ]
  },
  {
    title: "7. FUNCTION REFERENCE MANUAL",
    sections: [
      {
        subtitle: "Core Billing Register Functions",
        paragraphs: [
          "• handleCheckout() [NewBillScreen]: Processes carts, updates product quantities, increments loyalty metrics, saves records locally, and queues cloud updates.",
          "• formatWhatsAppMessage() [whatsappHelper]: Formats plain text receipts with bold formatting and emoji layouts, creating a clickable wa.me link.",
          "• buildInvoicePdf() [pdfHelper]: Renders item details, tax/discount savings, and clickable brand cards into a downloadable A4 PDF."
        ]
      },
      {
        subtitle: "Database and Inventory Operations",
        paragraphs: [
          "• saveProductToCloud() [firebase]: Saves a Product schema to Firestore.",
          "• generateDailyReports() [firebase]: Evaluates sales records, groups them by date, and saves daily revenue analytics to the database."
        ]
      }
    ]
  },
  {
    title: "8. FIREBASE DOCUMENTATION",
    sections: [
      {
        subtitle: "Database Schemes & Collections",
        paragraphs: [
          "• /products: ID-keyed documents containing barcodes, categories, and purchase/selling prices.",
          "• /bills: Keyed transactions tracking items, payment methods (Cash/UPI/Split), subtotal summaries, and creator metadata.",
          "• /customers: ID-keyed buyers tracking visits, overall spending, and past bill references."
        ]
      },
      {
        subtitle: "Operational Collections",
        paragraphs: [
          "• /users: Configures active login profiles for Siva Kumar and store employees.",
          "• /daily_reports: Analyzes performance metrics to track top-selling products and revenue sources."
        ]
      }
    ]
  },
  {
    title: "9. DATABASE DESIGN",
    sections: [
      {
        subtitle: "Database Schema and Entity Relationships",
        paragraphs: [
          "• Products to Bill Items (1:N): Products are linked to individual bill items via the productId key.",
          "• Bills to Customers (N:1): Multiple bills can be linked to a single customer record through their unique phone number.",
          "• Bills to Bill Items (1:N): A single Bill document holds an array of BillItem records containing details like name, unit price, and discount percentage."
        ]
      }
    ]
  },
  {
    title: "10. OFFLINE-FIRST ARCHITECTURE",
    sections: [
      {
        subtitle: "Local Web Persistence",
        paragraphs: [
          "To keep billing fast and reliable, the system saves all transaction data to LocalStorage immediately during checkout. This ensures the register continues to work even if the internet drops."
        ]
      },
      {
        subtitle: "Firestore Persistence Layer",
        paragraphs: [
          "Using Firebase's persistent cache, all write actions are buffered in local memory and automatically uploaded to the cloud once an active internet connection is detected."
        ]
      }
    ]
  },
  {
    title: "11. REAL-TIME MULTI-DEVICE SYNC",
    sections: [
      {
        subtitle: "Snapshot Replication Protocols",
        paragraphs: [
          "The system uses Firestore's real-time snapshot listeners to keep data in sync across devices. When Terminal A saves a sale, Firestore instantly notifies Terminal B, updating its products, bills, and customers lists without needing a manual refresh."
        ]
      }
    ]
  },
  {
    title: "12. BILLING MODULE",
    sections: [
      {
        subtitle: "Cart Calculations & Logic",
        paragraphs: [
          "• Subtotals are calculated per item: Quantity * Unit Price.",
          "• Item Discounts: Subtracts the item-wise discount percentage first.",
          "• Grand Total: Applies the overall invoice discount percentage, then rounds the final bill amount to the nearest rupee."
        ]
      }
    ]
  },
  {
    title: "13. WHATSAPP MODULE",
    sections: [
      {
        subtitle: "Digital Receipt Delivery",
        paragraphs: [
          "WhatsApp receipts are formatted using standard bold markdown, itemized pricing, and emojis. The receipt contains directions to the physical store and links to the shop's social media, encouraging customers to stay connected."
        ]
      }
    ]
  },
  {
    title: "14. PDF MODULE",
    sections: [
      {
        subtitle: "Client-Side jsPDF Compiler",
        paragraphs: [
          "The PDF module converts transactions into professional A4 invoices. It dynamically adjusts table sizes, handles long product lists with automatic page breaks, and adds interactive links to Google Maps, Instagram, and support contacts in the footer."
        ]
      }
    ]
  },
  {
    title: "15. BARCODE MODULE",
    sections: [
      {
        subtitle: "Code-128 Scanning & Printing Suite",
        paragraphs: [
          "The barcode module decodes physical barcodes using the terminal's camera with html5-qrcode. It also generates Code-128 compliant vector SVGs, allowing the store to print custom labels for items that don't have manufacturer barcodes."
        ]
      }
    ]
  },
  {
    title: "16. SECURITY ANALYSIS",
    sections: [
      {
        subtitle: "Production Security Standards",
        paragraphs: [
          "• Credentials: User passwords are encrypted using SHA-256 before being stored to prevent cleartext exposure.",
          "• Firestore Rules: Access is locked to verified terminal sessions.",
          "• Hardened Settings: All development and testing features have been removed to prevent unauthorized database resets in production."
        ]
      }
    ]
  },
  {
    title: "17. APK BUILD PROCESS",
    sections: [
      {
        subtitle: "Android Compilation Guide",
        paragraphs: [
          "To compile the application into a mobile APK, run:",
          "1. npm run build - Compiles the React web application.",
          "2. npx cap sync android - Copies the compiled assets to the Android Studio project.",
          "3. ./gradlew assembleDebug - Generates the installable app-debug.apk package."
        ]
      }
    ]
  },
  {
    title: "18. DEPLOYMENT GUIDE",
    sections: [
      {
        subtitle: "Production Deployment",
        paragraphs: [
          "• Production Keys: Add real Firebase config keys to .env.example.",
          "• Compile & Deploy: Build the web assets using npm run build and host them on Cloud Run or Firebase Hosting.",
          "• Set Up Security: Run 'firebase deploy --only firestore' to apply security rules."
        ]
      }
    ]
  },
  {
    title: "19. TESTING REPORT",
    sections: [
      {
        subtitle: "Quality Assurance Report",
        paragraphs: [
          "• Checkout Testing: Verified that taxes, discounts, and item subtotals calculate correctly under various sale scenarios.",
          "• Sync Reliability: Tested sales inside heavy-concrete market stalls; transactions queued locally and synced automatically once internet was restored."
        ]
      }
    ]
  },
  {
    title: "20. KNOWN LIMITATIONS",
    sections: [
      {
        subtitle: "Operational Limits",
        paragraphs: [
          "• Browser Caching: When running offline, data relies on LocalStorage. Clearing browser data can result in data loss. Keeping the terminal synced with the cloud prevents this issue.",
          "• Camera Focus: Low ambient lighting can affect barcode scanning speed when using standard device cameras."
        ]
      }
    ]
  },
  {
    title: "21. VERSION HISTORY",
    sections: [
      {
        subtitle: "Release Versions",
        paragraphs: [
          "• v1.0: Initial offline-only POS app with browser local storage.",
          "• v1.5: Added PDF invoice downloads and WhatsApp receipt formatting.",
          "• v2.0: Integrated Firestore background syncing and daily reports.",
          "• v2.1 (Current): Hardened Settings panel for production, removing all developer tools and test record builders."
        ]
      }
    ]
  },
  {
    title: "22. INTERVIEW PREPARATION",
    sections: [
      {
        subtitle: "Key Technical Speaking Points",
        paragraphs: [
          "When explaining this project, focus on the offline-first design: 'To support busy retail environments, I implemented a hybrid storage system using LocalStorage alongside a synchronized Firebase Firestore offline cache. This ensures the app remains fast and fully functional even when the internet is offline, automatically syncing data once a connection is restored.'"
        ]
      }
    ]
  },
  {
    title: "23. FUTURE ROADMAP",
    sections: [
      {
        subtitle: "Planned Upgrades",
        paragraphs: [
          "• Integrated SMS Alerts: Automatically send customer notifications via cheap text gateways.",
          "• AI Sales Forecasting: Predict festival inventory requirements based on historical sales trends."
        ]
      }
    ]
  },
  {
    title: "24. APPENDIX",
    sections: [
      {
        subtitle: "System Dependencies",
        paragraphs: [
          "• React: v19.0.1",
          "• TypeScript: v5.8.2",
          "• Firebase: v12.15.0",
          "• jsPDF: v4.2.1",
          "• html5-qrcode: v2.3.8",
          "• JsBarcode: v3.12.3"
        ]
      }
    ]
  }
];

// Cover / Title Page
doc.setFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
doc.rect(0, 0, pageWidth, pageHeight, "F");

// Decorative gold border
doc.setDrawColor(colorAccent[0], colorAccent[1], colorAccent[2]);
doc.setLineWidth(1);
doc.rect(10, 10, pageWidth - 20, pageHeight - 20, "S");

doc.setFont("Helvetica", "bold");
doc.setFontSize(22);
doc.setTextColor(colorAccent[0], colorAccent[1], colorAccent[2]);
doc.text("SRI LAKSHMI SAIRAM FANCY STORE", pageWidth / 2, 70, { align: "center" });

doc.setFontSize(16);
doc.setTextColor(255, 255, 255);
doc.text("POINT-OF-SALE BILLING & INVENTORY SYSTEM", pageWidth / 2, 85, { align: "center" });

doc.setDrawColor(colorAccent[0], colorAccent[1], colorAccent[2]);
doc.setLineWidth(0.5);
doc.line(40, 95, pageWidth - 40, 95);

doc.setFont("Helvetica", "normal");
doc.setFontSize(12);
doc.setTextColor(200, 205, 215);
doc.text("Complete Software Project Engineering Manual", pageWidth / 2, 110, { align: "center" });
doc.text("Architectural Blueprint, Source Code Analysis & Maintenance Guide", pageWidth / 2, 118, { align: "center" });

doc.setFontSize(10);
doc.setTextColor(colorAccent[0], colorAccent[1], colorAccent[2]);
doc.text("DEVELOPED FOR PRODUCTION USE", pageWidth / 2, 180, { align: "center" });

doc.setFontSize(9);
doc.setTextColor(180, 185, 195);
doc.text("Store Owner: Siva Kumar", pageWidth / 2, 210, { align: "center" });
doc.text("Phone Support: +91 8143102456", pageWidth / 2, 216, { align: "center" });
doc.text("Location: Vijayawada, Andhra Pradesh, India", pageWidth / 2, 222, { align: "center" });

doc.setFontSize(8);
doc.setTextColor(140, 145, 155);
doc.text("Document Version 2.1 (Harden Production Target Build)", pageWidth / 2, 250, { align: "center" });
doc.text("Generated: June 2026", pageWidth / 2, 256, { align: "center" });

let currentY = 30;

// Iterate through chapters to build the document pages
chapters.forEach((chapter, index) => {
  doc.addPage();
  currentPageNum++;
  
  // Set background to pure white
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  drawPageHeader(doc, currentPageNum);
  drawPageFooter(doc, currentPageNum);
  
  currentY = 25;
  
  // Draw Chapter Title banner
  doc.setFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.rect(margin, currentY, contentWidth, 10, "F");
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(chapter.title, margin + 4, currentY + 6.5);
  
  currentY += 16;
  
  chapter.sections.forEach((section) => {
    // Check if we need a page break before the section
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentPageNum++;
      drawPageHeader(doc, currentPageNum);
      drawPageFooter(doc, currentPageNum);
      currentY = 25;
    }
    
    // Draw Section Subtitle
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(colorAccent[0], colorAccent[1], colorAccent[2]);
    doc.text(section.subtitle, margin, currentY);
    
    currentY += 5.5;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(colorCharcoal[0], colorCharcoal[1], colorCharcoal[2]);
    
    section.paragraphs.forEach((para) => {
      // Split paragraph text to size to fit page bounds
      const lines = doc.splitTextToSize(para, contentWidth);
      
      lines.forEach((line) => {
        if (currentY > pageHeight - 25) {
          doc.addPage();
          currentPageNum++;
          drawPageHeader(doc, currentPageNum);
          drawPageFooter(doc, currentPageNum);
          currentY = 25;
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(colorCharcoal[0], colorCharcoal[1], colorCharcoal[2]);
        }
        doc.text(line, margin, currentY);
        currentY += 4.5;
      });
      
      currentY += 2.5; // Gap between paragraphs
    });
    
    currentY += 4; // Gap between sections
  });
});

try {
  const outputBuffer = Buffer.from(doc.output("arraybuffer"));
  fs.writeFileSync("./DOCUMENTATION.pdf", outputBuffer);
  console.log("✅ DOCUMENTATION.pdf created successfully at project root!");
} catch (error) {
  console.error("❌ Failed to output and write DOCUMENTATION.pdf file: ", error);
}
