from PIL import Image

# Convert text to binary
def text_to_bin(text):
    return ''.join(format(ord(c), '08b') for c in text)

# Convert binary to text
def bin_to_text(binary):
    chars = [binary[i:i+8] for i in range(0, len(binary), 8)]
    return ''.join(chr(int(c, 2)) for c in chars)

# Encode message in image
def encode_image(input_path, output_path, secret_message):
    img = Image.open(input_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')

    binary_msg = text_to_bin(secret_message) + "1111111111111110"  # EOF marker
    data_index = 0
    new_pixels = []

    for pixel in list(img.getdata()):
        r, g, b = pixel
        if data_index < len(binary_msg):
            r = (r & ~1) | int(binary_msg[data_index])  # replace LSB
            data_index += 1
        if data_index < len(binary_msg):
            g = (g & ~1) | int(binary_msg[data_index])
            data_index += 1
        if data_index < len(binary_msg):
            b = (b & ~1) | int(binary_msg[data_index])
            data_index += 1
        new_pixels.append((r, g, b))

    img.putdata(new_pixels)
    img.save(output_path, "PNG")
    print(f"✅ Message hidden successfully in {output_path}")

# Decode message from image
def decode_image(image_path):
    img = Image.open(image_path)
    binary_data = ""
    for pixel in list(img.getdata()):
        r, g, b = pixel
        binary_data += str(r & 1)
        binary_data += str(g & 1)
        binary_data += str(b & 1)

    # Split by 8 bits
    all_bytes = [binary_data[i:i+8] for i in range(0, len(binary_data), 8)]
    decoded_text = ""
    for byte in all_bytes:
        char = chr(int(byte, 2))
        decoded_text += char
        if decoded_text.endswith("￾"):  # marker found
            return decoded_text[:-1]
    return decoded_text
