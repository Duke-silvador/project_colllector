from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import ElementClickInterceptedException
from selenium.common.exceptions import StaleElementReferenceException
import time
import json

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
        print(i+1)
        try:
            a = a2[i].find_element(By.XPATH, './div[2]/h3/a')
            print(f'找到 a: {a.text}, href={a.get_attribute("href")}')
            try:
                a.click()
            except ElementClickInterceptedException:
                browser.execute_script("arguments[0].click();", a)
            browser.switch_to.window(browser.window_handles[1])
            completion_form[i] = check(browser)
            print(f'check 结果: {f[completion_form[i]]}')
            browser.close()
            browser.switch_to.window(main_window)
        except Exception as e:
            print(f'第 {i+1} 轮异常: {type(e).__name__}: {e}')
    print(completion_form)
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
        print('error:',e)
def roll_zj(browser):#browser 维持课程页面，获取目录进入对应iframe
    coursetree = browser.find_elements(By.XPATH, '//*[@id="coursetree"]/ul/li')
    print('总共章数:', len(coursetree))
    l = len(coursetree)
    for i in range(l):
        coursetree = browser.find_elements(By.XPATH, '//*[@id="coursetree"]/ul/li')
        i_elem = coursetree[i]
        branch = i_elem.find_elements(By.XPATH, './/li')
        print('所在章的节数量:', len(branch))
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
    while(True):
        browser=web_set()
        browser.get('https://v8.chaoxing.com/')
        a0=browser.find_element(By.XPATH,'/html/body/div[1]/div/div[2]/div/div[1]/ul/li[2]')
        a0.click()
        start=time.time()
        login=False
        while(not signin(browser)):
            if(time.time()-start>360):
                print('超时登录，重试')
                break
            time.sleep(1)
        else:
            login=True
        if not login:
            browser.quit()
            continue
        main_window=browser.current_window_handle
        while(True):
            mode=input('模式选择\nInitialize(初次运行或课程发生变化请选择此模式)\nCall(调用上次获取的课程完成情况)\nCustom(指定课程进行完成)\nmode:')
            if(mode.lower()=='initialize'):
                Initialize(browser)
                break
            elif(mode.lower()=='call'):
                Call(browser)
                break
            elif(mode.lower()=='custom'):
                number=int(input('输入课程编号(从头数,首位为0):'))
                Custom(browser,number)
                break
            else:
                print('无效模式名')
                continue
        print('模式已执行')
        break