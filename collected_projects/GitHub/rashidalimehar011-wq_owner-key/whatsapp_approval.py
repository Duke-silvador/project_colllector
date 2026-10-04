#!/usr/bin/env python3
# WhatsApp Approval System
# By: Rashid Ali Mehar

import os, sys, urllib.parse, subprocess

OWNER_WHATSAPP = "923321408595"
OWNER_NAME = "Rashid Ali Mehar"

def clear():
    os.system("clear")

def show_menu():
    clear()
    print("""
===========================================
   OWNER APPROVAL REQUIRED
   By: Rashid Ali Mehar
===========================================

Ye tool sirf approved users ke liye hai.

Aapke paas 2 options hain:

  [A] WhatsApp pe approval maango
  [B] Mere paas Access Key hai

""")

def send_whatsapp_request():
    message = f"Assalam-o-Alaikum {OWNER_NAME} bhai! Main aapka tool use karna chahta hoon. Baraye meherbani mujhe Access Key de dein. Shukriya!"
    encoded = urllib.parse.quote(message)
    url = f"https://wa.me/{OWNER_WHATSAPP}?text={encoded}"
    
    print("\nWhatsApp khul raha hai...")
    print(f"Number: +{OWNER_WHATSAPP}\n")
    
    try:
        subprocess.run(["termux-open-url", url], check=False)
    except:
        print(f"Ye link kholo: {url}")
    
    input("\nEnter dabao jab WhatsApp khul jaye...")

def check_key():
    try:
        from check_approval import verify
        verify()
        return True
    except SystemExit:
        return False

def main():
    show_menu()
    choice = input("Apna option chuno (A/B): ").strip().upper()
    
    if choice == "A":
        send_whatsapp_request()
        print("\nWhatsApp pe request bhej di!")
        print("Owner ke reply ka intezaar karo...\n")
        input("Jab key mil jaye, Enter dabao...")
        clear()
        check_key()
    elif choice == "B":
        clear()
        check_key()
    else:
        print("\nGalat option! Sirf A ya B likho.")
        sys.exit(1)

if __name__ == "__main__":
    main()
