import os
import shutil

#folder path you want to organize
FOLDER_PATH = os.getcwd() # current working directory

#file type mapping
FILE_TYPES = {
    'Images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
    'Documents': ['.pdf', '.docx', '.txt', '.xlsx'],
    'Audio': ['.mp3', '.wav', '.aac'],
    'Videos': ['.mp4', '.avi', '.mkv'],
    'Archives': ['.zip', '.rar', '.tar.gz']
}

# create folders if they don't exist
for folder in FILE_TYPES.keys(): #create folders for each file type
    folder_path = os.path.join(FOLDER_PATH, folder)
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

# organize files
for file in os.listdir(FOLDER_PATH):
    file_path = os.path.join(FOLDER_PATH, file)

#skip folders
    if os.path.isdir(file_path):
        continue

    #get file extension
    file_ext = os.path.splitext(file)[1].lower()


    #move file to corresponding folder
    for folder, extensions in FILE_TYPES.items():
        if file_ext in extensions:
            shutil.move(file_path, os.path.join(FOLDER_PATH, folder, file))

            break
print("Files organized successfully!")
   

