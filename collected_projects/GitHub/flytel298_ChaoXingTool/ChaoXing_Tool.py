from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import ElementClickInterceptedException
from selenium.common.exceptions import StaleElementReferenceException
import urllib.request as req 
import time
import json
import threading
import tkinter as tk
from tkinter import messagebox
from tkinter import scrolledtext
import queue
main=None
log=None
browser=None
report_queue=queue.Queue()
mode_queue = queue.Queue()

def signin_interface(browser):
    sign=tk.Tk()
    sign.title('超星助手')
    w,h=sign.maxsize()
    sign.geometry(f'{int(w*0.3)}x{int(h*0.4)}+{int(w*0.25)}+{int(h*0.25)}')
    sign.resizable(False,False)
    sign.iconbitmap('long.ico')
    sign.update_idletasks()
    win_w = sign.winfo_width()
    win_h = sign.winfo_height()
    tk.Label(text='请扫码登录',font=('黑体',15)).place(x=win_w*0.40,y=win_h*0.1)
    code_iframe=browser.find_element(By.XPATH,'//iframe')
    browser.switch_to.frame(code_iframe)
    page_src=browser.find_element(By.XPATH,'//*[@id="ewm"]').get_attribute('src')
    browser.switch_to.default_content()
    try:
        response=req.urlopen(page_src)
        with open('code_page.png','wb') as f:
            f.write(response.read())
        img = tk.PhotoImage(file='code_page.png')
        sign.img = img
        tk.Label(sign, image=img).place(x=win_w*0.24,y=win_h*0.2)
        start=time.time()
        result = {'done': False, 'ok': False}
        def worker():
            while True:
                try:
                    if signin(browser):
                        result['ok'] = True
                        result['done'] = True
                        return
                except Exception:
                    pass
                if time.time() - start > 360:
                    result['ok'] = False
                    result['done'] = True
                    return
                time.sleep(1)
        def check_login():
            if result['done']:
                if result['ok']:
                    sign_ = tk.Toplevel()
                    sign_.focus_set()
                    sign_.attributes('-topmost', True)
                    sign_.geometry(f'{int(w*0.2)}x{int(h*0.06)}+{int(w*0.25)}+{int(h*0.25)}')
                    sign_.resizable(False, False)
                    sign_.iconbitmap('long.ico')
                    label = tk.Label(sign_, text='登陆中......', font=('黑体'))
                    label.pack()
                    def switch_to_main():
                        try:
                            user_name = browser.find_element(By.XPATH, '//p[@class="user-name"]').text
                        except NoSuchElementException:
                            user_name = ''
                        if user_name:
                            label.config(text=f'欢迎回来，{user_name}')
                            sign_.after(4000, close_all)   # 4 秒后关
                        else:
                            sign_.after(500,switch_to_main)    # 0.5 秒后再试
                    def close_all():
                        sign.destroy()
                        sign_.destroy()
                    sign_.after(500,switch_to_main)
                else:
                    browser.quit()
                    messagebox.showerror('错误','登录超时，请重试')
                    sign.destroy()
            else:
                sign.after(1000, check_login)
        threading.Thread(target=worker, daemon=True).start()
        sign.after(1000, check_login)   
    except:
        messagebox.showinfo('助手版本不符或网络断开')
        browser.quit()
        sign.destroy()
        return False
    sign.mainloop()
    return result['ok']

def gui_print(*args, **kwargs):
    text = ' '.join(str(a) for a in args)
    report_queue.put(text)

def into_Initialize():
    mode_queue.put('initialize')
def into_Call():
    mode_queue.put('call')
def into_Custom(number):
    mode_queue.put('custom')
    mode_queue.put(number)

def log_roll():
    try:
        while True:
            report = report_queue.get_nowait()
            log.insert(tk.END, report + '\n')
            log.see(tk.END)
    except queue.Empty:
        pass
    main.after(200,log_roll)

def worker():
    while True:
        while True:
            mode=mode_queue.get()
            if mode=='initialize':
                Initialize(browser)
            elif mode=='call':
                Call(browser)
            elif mode=='custom':
                number=mode_queue.get()
                Custom(browser,number)
                break 
            else:
                main.destroy()
                break
def start_worker():
    t = threading.Thread(target=worker, daemon=True)
    t.start()
def main_face():
    global main,log
    main=tk.Tk()
    main.title('超星助手')
    w,h=main.maxsize()
    main.geometry(f'{int(w*0.4)}x{int(h*0.4)}+{int(w*0.25)}+{int(h*0.25)}')
    main.resizable(False,False)
    main.iconbitmap('long.ico')
    main.update_idletasks()
    win_w = main.winfo_width()
    win_h = main.winfo_height()
    tk.Button(main,text='初始化',font=('黑体',15),command=into_Initialize,width=10).place(x=int(win_w*0.1),y=int(win_h*0.8))
    tk.Button(main,text='调用',font=('黑体',15),command=into_Call,width=10).place(x=int(win_w*0.3),y=int(win_h*0.8))
    tk.Button(main,text='自定义',font=('黑体',15),command=lambda:into_Custom(number.get()),width=10).place(x=int(win_w*0.8),y=int(win_h*0.8))        
    number=tk.StringVar()
    tk.Entry(main,textvariable=number,font=('黑体',15),width=17).place(x=int(win_w*0.5),y=int(win_h*0.8))
    log = scrolledtext.ScrolledText(main, width=80, height=20)
    log.place(x=int(win_w*0.1),y=int(win_h*0.1))
    main.after(200,log_roll)
    main.after(100,start_worker)
    main.mainloop()
def web_set():
    q1=Options()
    q1.add_experimental_option('detach',True)
    service = Service(executable_path='msedgedriver.exe')
    browser=webdriver.Edge(service =service,options=q1)
    browser.implicitly_wait(2)
    return browser

def signin(browser):
    try:
        a=browser.find_element(By.XPATH,'//*[@id="showPrompt"]/a')
        a.click()
        return True
    except NoSuchElementException:
        return False

def check(browser):#检查课程完成情况返回bool
    try:
        result = False
        try:
            a=browser.find_element(By.XPATH, '//span[@class="warn-txt"]')
            result=True
        except:
            a0 = browser.find_element(By.XPATH, '//a[@title="章节"]')
            a0.click()
            a1 = browser.find_element(By.XPATH, '//*[@id="frame_content-zj"]')
            browser.switch_to.frame(a1)
            try:
                browser.find_element(By.XPATH, '//*[@id="fanyaChapter"]//div[@class="nodata"]')
                result = True
            except NoSuchElementException:
                a3 =browser.find_element(By.XPATH, '//*[@id="fanyaChapter"]/div/div[1]/h2/span').text
                a4 = browser.find_element(By.XPATH, '//*[@id="fanyaChapter"]/div/div[1]/h2').text.split('/')[-1]
                if a3==a4:
                    result = True
        return result
    finally:
        browser.switch_to.default_content()

def form(main_window,browser,l):#返回课程完成列表
    completion_form=[True]*l
    f={False:'未完成',True:'已完成'}
    for i in range(l):
        browser.switch_to.window(main_window)
        a2=into_iframe(browser)
        gui_print(i+1)
        try:
            a = a2[i].find_element(By.XPATH, './div[2]/h3/a')
            gui_print(f'找到 a: {a.text}, href={a.get_attribute("href")}')
            try:
                a.click()
            except ElementClickInterceptedException:
                browser.execute_script("arguments[0].click();", a)
            browser.switch_to.window(browser.window_handles[1])
            completion_form[i] = check(browser)
            gui_print(f'check 结果: {f[completion_form[i]]}')
            browser.close()
            browser.switch_to.window(main_window)
        except Exception as e:
            gui_print(f'第 {i+1} 轮异常: {type(e).__name__}: {e}')
    gui_print(completion_form)
    return completion_form

def into_iframe(browser):#return 学科li列,browser switch 主页iframe
    a1=browser.find_element(By.XPATH,'//*[@id="frame_content"]')
    browser.switch_to.frame(a1)
    a2=browser.find_elements(By.XPATH,'/html/body/div[1]/div/div/div[2]/div[1]/div[2]/div[2]/ul/li')
    return a2

def start_zj(browser,i):#browser switch 课程页面
    a1=into_iframe(browser)
    a2 = a1[i].find_element(By.XPATH, './div[2]/h3/a')
    try:
        a2.click()
    except ElementClickInterceptedException:
        browser.execute_script("arguments[0].click();", a2)
    browser.switch_to.window(browser.window_handles[1])
    a3 = browser.find_element(By.XPATH, '//a[@title="章节"]')
    a3.click()
    a4 = browser.find_element(By.XPATH, '//*[@id="frame_content-zj"]')
    browser.switch_to.frame(a4)
    a5=browser.find_element(By.XPATH,'//div[@class="catalog_level"]')
    try:
        a6=a5.find_element(By.XPATH,'.//a')
        a6.click()
        browser.switch_to.window(browser.window_handles[1])
    except Exception as e:
        gui_print('error:',e)

def roll_zj(browser):#browser 维持课程页面，获取目录进入对应iframe
    coursetree = browser.find_elements(By.XPATH, '//*[@id="coursetree"]/ul/li')
    gui_print('总共章数:', len(coursetree))
    l = len(coursetree)
    for i in range(l):
        coursetree = browser.find_elements(By.XPATH, '//*[@id="coursetree"]/ul/li')
        i_elem = coursetree[i]
        branch = i_elem.find_elements(By.XPATH, './/li')
        gui_print('所在章的节数量:', len(branch))
        lb = len(branch)
        for j in range(lb):
            coursetree = browser.find_elements(By.XPATH, '//*[@id="coursetree"]/ul/li')
            branch = coursetree[i].find_elements(By.XPATH, './/li')
            j_elem = branch[j]
            try:
                status = j_elem.find_element(By.XPATH, './div/span[2]').get_attribute('class')
                if ('catalog_points_yi prevTips' in status):
                    frame_change = j_elem.find_element(By.XPATH, './/span[@onclick]')
                    try:
                        frame_change.click()
                    except ElementClickInterceptedException:
                        browser.execute_script("arguments[0].click();", frame_change)
                    browser.switch_to.frame(browser.find_element(By.XPATH, '//iframe[@id="iframe"]'))
                    roll_vedio(browser)
            except StaleElementReferenceException:
                continue
            finally:
                browser.switch_to.default_content()
    browser.close()

def roll_vedio(browser):#进行最小单元节点内的所有视频播放
    table=browser.current_window_handle
    p=browser.find_elements(By.XPATH,'//p[@tabindex="-1"]')
    l=len(p)
    for i in range(l):
        a=''
        p=browser.find_elements(By.XPATH,'//p[@tabindex="-1"]')
        time.sleep(1)
        a=p[i].find_element(By.XPATH,'.//div[@aria-label]').get_attribute('aria-label')
        time.sleep(1)
        if('未' in a):
            vedio_iframe=p[i].find_element(By.XPATH,'.//iframe')
            browser.switch_to.frame(vedio_iframe)
            button=browser.find_element(By.XPATH,'//button[@title="播放视频"]')
            try:
                button.click()
            except ElementClickInterceptedException:
                browser.execute_script("arguments[0].click();", button)
            browser.switch_to.parent_frame()
            p=browser.find_elements(By.XPATH,'//p[@tabindex="-1"]')
            a=p[i].find_element(By.XPATH,'.//div[@aria-label]').get_attribute('aria-label')
            while('未' in a):
                p=browser.find_elements(By.XPATH,'//p[@tabindex="-1"]')
                a=p[i].find_element(By.XPATH,'.//div[@aria-label]').get_attribute('aria-label')
                time.sleep(10)

def Initialize(browser):
    a2=into_iframe(browser)
    completion_form=form(main_window,browser,len(a2))
    with open('data_save/form.json', 'w', encoding='utf-8') as f:
        json.dump(completion_form, f)
    print('初始化完成，开始课程观看')
    for i in range(len(completion_form)):
        if not completion_form[i]:
            start_zj(browser,i)
            time.sleep(5)
            roll_zj(browser)
            browser.switch_to.window(main_window)
    time.sleep(20)
def Call(browser):
    with open('data_save/form.json', 'r', encoding='utf-8') as f:
        form=json.load(f)
    for i in range(len(form)):
        if not form[i]:
            start_zj(browser,i)
            time.sleep(5)
            roll_zj(browser)
            browser.switch_to.window(main_window)
def Custom(browser,number):
        start_zj(browser,number)
        time.sleep(5)
        roll_zj(browser)
        browser.switch_to.window(main_window)

if __name__=='__main__':
        browser=web_set()
        browser.get('https://v8.chaoxing.com/')
        a0=browser.find_element(By.XPATH,'/html/body/div[1]/div/div[2]/div/div[1]/ul/li[2]')
        a0.click()
        login=signin_interface(browser)
        if login:
            main_window=browser.current_window_handle
            main_face()
