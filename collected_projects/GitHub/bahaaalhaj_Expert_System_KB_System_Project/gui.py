import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageTk, ImageDraw
from engine import NutritionExpert  

# ===================== Theme Colors =====================
DARK_BROWN = "#3B2E2E"
PEACH = "#F7B68B"
YELLOW_SOFT = "#F6DE7F"
WHITE = "#FFFFFF"

def create_gradient(width, height, color1, color2):
    img = Image.new("RGB", (width, height), color1)
    draw = ImageDraw.Draw(img)
    for i in range(height):
        ratio = i / height
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(0, i), (width, i)], fill=(r, g, b))
    return ImageTk.PhotoImage(img)

# ===================== Main Window Setup =====================
root = tk.Tk()
root.title("Nutrition Expert System")
root.geometry("900x700")
root.config(bg=DARK_BROWN)

expert = NutritionExpert()
expert.reset()

# Sidebar Gradient
sidebar_width = 80
gradient_img = create_gradient(sidebar_width, 900, (255, 180, 150), (255, 110, 120))

# Left Sidebar
left_panel = tk.Label(root, image=gradient_img, borderwidth=0)
left_panel.pack(side=tk.LEFT, fill=tk.Y)

# Right Sidebar
right_panel = tk.Label(root, image=gradient_img, borderwidth=0)
right_panel.pack(side=tk.RIGHT, fill=tk.Y)

# Center Area
center_bg_frame = tk.Frame(root, bg=DARK_BROWN)
center_bg_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

container = tk.Frame(center_bg_frame, bg=DARK_BROWN)
container.place(relx=0.5, rely=0.5, anchor=tk.CENTER)

# ===================== BMI FUNCTIONS =====================
def calculate_bmi(weight, height_cm):
    try:
        return round(weight / ((height_cm/100)**2), 2)
    except ZeroDivisionError:
        return 0

def bmi_category(bmi):
    if bmi < 18.5:
        return "Underweight", "#76A9EA"
    elif bmi <= 24.9:
        return "Normal", "#4CAF50"
    elif bmi <= 29.9:
        return "Overweight", "#FFAF45"
    else:
        return "Obese", "#F95D5D"

# === Change Progressbar Color ===
def update_bmi_color(color):
    
    style = ttk.Style()
    style.configure("colored.Horizontal.TProgressbar",
                    troughcolor="#333333",
                    background=color)

# ===================== Expert Advice Function =====================
def get_advice():
    try:
        weight = float(weight_entry.get())
        height = float(height_entry.get())
        if weight <= 0 or height <= 0:
            messagebox.showerror("Invalid Input", "Weight and height must be greater than 0.")
            return
        problem = problem_var.get()
        activity = activity_var.get()

        expert.reset()
        expert.load_user(weight, height, problem, activity)
        expert.run()

        advices = expert.get_advices()
        bmi = calculate_bmi(weight, height)
        category, color = bmi_category(bmi)

        bmi_var.set(bmi)
        bmi_progress["value"] = bmi

        # Change bar color
        update_bmi_color(color)

        if advices:
            a = advices[0]
            result_label.config(
                text=f"📌 BMI: {bmi} ({category})\n\n"
                     f"Health Problem: {problem}\n"
                     f"Activity Level: {activity}\n\n"
                     f"💡 Advice:\n{a['advice']}\n\n"
                     f"🥗 Recommended:\n{a['recommended']}\n\n"
                     f"❌ Avoid:\n{a['avoid']}",
                fg=color
            )
        else:
            result_label.config(text="No specific advice found.", fg=WHITE)

    except ValueError:
        messagebox.showerror("Error", "Please enter valid numeric values.")
    except Exception as e:
        messagebox.showerror("Error", f"An error occurred: {e}")

# ===================== Trace Window =====================
def show_trace():
    trace = expert.get_trace()
    if not trace:
        messagebox.showinfo("Trace", "No trace available yet.")
        return

    win = tk.Toplevel(root)
    win.title("Rule Trace")
    win.geometry("600x500")
    win.config(bg=DARK_BROWN)

    text = tk.Text(win, bg=DARK_BROWN, fg=WHITE, font=("Arial", 12))
    text.pack(fill="both", expand=True)
    text.tag_config("red_line", foreground="red")

    for line in trace:
        if "MATCHED" in line:  
            text.insert(tk.END, "• " + line + "\n", "red_line")
        else:
            text.insert(tk.END, "• " + line + "\n")

# ===================== UI Layout =====================

title = tk.Label(container, text="Expert System for Nutrition Advice",
                 bg=DARK_BROWN, fg=WHITE, font=("Helvetica", 20, "bold"))
title.pack(pady=(0, 20))

# Input Card
card = tk.Frame(container, bg="#4A3D3D", bd=2, relief="ridge")
card.pack(pady=10)

label_style = {"bg": "#4A3D3D", "fg": WHITE, "font": ("Helvetica", 12)}

tk.Label(card, text="Weight (kg):", **label_style).grid(row=0, column=0, sticky="w", padx=10, pady=6)
weight_entry = tk.Entry(card, font=("Helvetica", 12), width=18)
weight_entry.grid(row=0, column=1, padx=10, pady=6)

tk.Label(card, text="Height (cm):", **label_style).grid(row=1, column=0, sticky="w", padx=10, pady=6)
height_entry = tk.Entry(card, font=("Helvetica", 12), width=18)
height_entry.grid(row=1, column=1, padx=10, pady=6)

# Problem
problem_var = tk.StringVar()
problems = ["Diabetes","Hypertension","Obesity","Underweight","Normal",
            "Active Athlete","Elderly Person","Teenager","Pregnant Woman","Heart Disease"]

tk.Label(card, text="Health Problem:", **label_style).grid(row=2, column=0, sticky="w", padx=10, pady=6)
problem_dropdown = ttk.Combobox(card, textvariable=problem_var, values=problems,
                                state="readonly", width=17)
problem_dropdown.grid(row=2, column=1, padx=10, pady=6)
problem_dropdown.current(0)

# Activity
activity_var = tk.StringVar()
activities = ["Low","Moderate","High"]

tk.Label(card, text="Activity Level:", **label_style).grid(row=3, column=0, sticky="w", padx=10, pady=6)
activity_dropdown = ttk.Combobox(card, textvariable=activity_var, values=activities,
                                 state="readonly", width=17)
activity_dropdown.grid(row=3, column=1, padx=10, pady=6)
activity_dropdown.current(0)

# Buttons
btn_style = {
    "font": ("Helvetica", 13, "bold"),
    "fg": DARK_BROWN,
    "width": 16,
    "bd": 0
}

tk.Button(container, text="Get Advice", command=get_advice,
          bg=YELLOW_SOFT, activebackground=PEACH, **btn_style).pack(pady=10)

tk.Button(container, text="Show Trace", command=show_trace,
          bg=PEACH, activebackground=YELLOW_SOFT, **btn_style).pack()

# BMI Indicator
tk.Label(container, text="BMI Indicator:",
         bg=DARK_BROWN, fg=WHITE, font=("Helvetica", 14, "bold")).pack(pady=10)

style = ttk.Style()
style.theme_use("clam")   
style.configure("colored.Horizontal.TProgressbar",
                thickness=20,
                troughcolor="#333333",
                background="#4CAF50")

bmi_var = tk.DoubleVar()
bmi_progress = ttk.Progressbar(container, length=280, maximum=50,
                               variable=bmi_var, style="colored.Horizontal.TProgressbar")
bmi_progress.pack()

# Output
result_label = tk.Label(container, bg=DARK_BROWN, fg=WHITE,
                        wraplength=350, justify="left",
                        font=("Helvetica", 12))
result_label.pack(pady=15)

root.mainloop()
