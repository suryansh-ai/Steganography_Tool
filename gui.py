def refresh_ui():
    global file_path
    file_path = None
    lbl.config(text="Upload an image")
    txt_message.delete("1.0", tk.END)
import tkinter as tk
from tkinter import filedialog, messagebox
from stego import encode_image, decode_image

def upload_image():
    global file_path
    file_path = filedialog.askopenfilename(filetypes=[("Image files", "*.png;*.bmp")])
    if file_path:
        lbl.config(text=f"Selected: {file_path}")

def hide_message():
    if not file_path:
        messagebox.showerror("Error", "Please select an image first")
        return
    msg = txt_message.get("1.0", tk.END).strip()
    if not msg:
        messagebox.showerror("Error", "Message cannot be empty")
        return
    save_path = filedialog.asksaveasfilename(defaultextension=".png")
    encode_image(file_path, save_path, msg)
    messagebox.showinfo("Success", f"Message hidden in {save_path}")

def extract_message():
    if not file_path:
        messagebox.showerror("Error", "Please select an image first")
        return
    try:
        hidden_msg = decode_image(file_path)
        messagebox.showinfo("Hidden Message", hidden_msg)
    except:
        messagebox.showerror("Error", "No hidden message found")

# GUI Window

# --- Dark Theme Colors ---
BG_COLOR = "#1e1e1e"
FG_COLOR = "#00ff00"
BTN_BG = "#333"
BTN_FG = FG_COLOR
TXT_BG = "#222"
TXT_FG = "#0f0"

root = tk.Tk()
root.title("Steganography Tool")
root.geometry("500x400")
root.configure(bg=BG_COLOR)

file_path = None

lbl = tk.Label(root, text="Upload an image", font=("Arial", 12), bg=BG_COLOR, fg=FG_COLOR)
lbl.pack(pady=10)

btn_upload = tk.Button(root, text="Upload Image", command=upload_image, bg=BTN_BG, fg=BTN_FG)
btn_upload.pack(pady=5)

txt_message = tk.Text(root, height=5, width=50, bg=TXT_BG, fg=TXT_FG, insertbackground=FG_COLOR)
txt_message.pack(pady=10)

btn_hide = tk.Button(root, text="Hide Message", command=hide_message, bg=BTN_BG, fg=BTN_FG)
btn_hide.pack(pady=5)

btn_extract = tk.Button(root, text="Extract Message", command=extract_message, bg=BTN_BG, fg=BTN_FG)
btn_extract.pack(pady=5)

# Refresh Button
btn_refresh = tk.Button(root, text="Refresh", command=refresh_ui, bg="#222", fg=FG_COLOR)
btn_refresh.pack(pady=10)

root.mainloop()

