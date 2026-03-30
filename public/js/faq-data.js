(function (global) {
  global.FAQ_CONTENT = {
    lv: [
      {
        id: 'start',
        title: 'No sākta — īsi un vienkārši',
        items: [
          {
            q: 'Kas ir Qlynton?',
            a: 'Tas ir rīks rēķinu veidošanai. Tu vari uzrakstīt rēķinu par savu darbu, saglabāt to vienuviet, izdrukāt kā PDF un redzēt, vai nauda jau ir samaksāta.'
          },
          {
            q: 'Ko darīt vispirms?',
            a: '1) Iestatījumos pievieno uzņēmumu un aizpildi bankas rekvizītus: banka (no saraksta vai pats), SWIFT/BIC, IBAN — tie parādīsies rēķina PDF.\n2) Pievieno klientu, kam sūti rēķinus.\n3) Spied «Izveidot rēķinu» un aizpildi rindas.'
          },
          {
            q: 'Kur ir galvenās pogas?',
            a: 'Augšā: «Mani rēķini» — tavs saraksts. «Izveidot rēķinu» — jauns rēķins. Zobrata ikona — iestatījumi (uzņēmums, klienti, valoda). Jautājuma zīme — šī palīdzības lapa. Ja redzi bankas ikonu, tā vedīs uz internetbanku (ja esi to iestatījis).'
          }
        ]
      },
      {
        id: 'invoices',
        title: 'Rēķini',
        items: [
          {
            q: 'Kā izveidot jaunu rēķinu?',
            a: 'Spied «Izveidot rēķinu». Izvēlies uzņēmumu un klientu, ieraksti datumu un rindas (kas, cik daudz, cena). Saglabā. Vēlāk vari lejupielādēt PDF vai kopīgot to no saraksta (⋯ izvēlne).'
          },
          {
            q: 'Kā atrast vecu rēķinu?',
            a: 'Atver «Mani rēķini». Lieto meklēšanu, datumus, klientu vai statusu. Ir arī īsie filtri, piemēram, «Šis mēnesis». «Notīrīt filtrus» atiestata visu.'
          },
          {
            q: 'Ko nozīmē melnraksts, nosūtīts, kavēts, apmaksāts?',
            a: 'Melnraksts — vēl neesi pabeidzis vai nosūtījis. Nosūtīts — jau nosūtīts klientam. Kavēts — termiņš pagājis, nauda vēl nav. Apmaksāts — viss samaksāts. Statusu vari mainīt rēķina redaktorā pēc sava procesa.'
          },
          {
            q: 'Kā dabūt PDF?',
            a: 'Atver rēķinu un izmanto lejupielādi PDF. Fails ir gatavs nosūtīšanai vai drukāšanai.'
          },
          {
            q: 'Vai varu nosūtīt rēķinu e-pastā?',
            a: 'Sarakstā pie rēķina atver ⋯ izvēlni un izvēlies «Kopīgot…», lai sistēma piedāvātu nosūtīt PDF (piemēram, uz e-pastu). Ja pielikums neparādās, lejupielādē PDF un pievieno to vēstulē pats.'
          }
        ]
      },
      {
        id: 'setup',
        title: 'Uzņēmums, klienti un pakalpojumi',
        items: [
          {
            q: 'Kā iestatīt bankas rekvizītus?',
            a: 'Atver Iestatījumus → Mani uzņēmumi → Rediģēt uzņēmumu. Izvēlies banku no saraksta (vai ieraksti pats). Ievadi SWIFT/BIC un IBAN. Ja bankas nav sarakstā, vari pievienot arī saiti uz internetbanku. Šī informācija parādās rēķina PDF apakšā.'
          },
          {
            q: 'Kāpēc vajag uzņēmumu?',
            a: 'Uz rēķina parādās tavs nosaukums, adrese, banka un citi rekvizīti. Iestatījumos vari pievienot vairākus uzņēmumus un izvēlēties noklusējumu jauniem rēķiniem.'
          },
          {
            q: 'Kas ir klients?',
            a: 'Tas, kam sūti rēķinu. Saglabā vārdu, adresi un e-pastu, lai nākamreiz nevajadzētu rakstīt no jauna.'
          },
          {
            q: 'Kas ir pakalpojumi?',
            a: 'Saraksts ar biežiem darbiem un cenām. Tos var ātri ielikt rēķinā kā rindas, bet vari arī rakstīt jebko manuāli.'
          },
          {
            q: 'Kāpēc bankas izvēle?',
            a: 'Lai uz rēķina būtu pareizs bankas nosaukums un konts. Ja bankas nav sarakstā, vari ierakstīt pats un, ja vajag, pievienot saiti uz internetbanku.'
          }
        ]
      },
      {
        id: 'settings',
        title: 'Iestatījumi un papildu lietas',
        items: [
          {
            q: 'Kur mainīt valodu un tumšo režīmu?',
            a: 'Iestatījumi → Izskats un valoda: vari mainīt programmas valodu, rēķinu valodu (PDF tekstiem) un gaišo vai tumšo tēmu.'
          },
          {
            q: 'Kā darbojas «Kopīgot…»?',
            a: 'Pārlūks atver operētājsistēmas kopīgošanas izvēlni — vari nosūtīt PDF uz citu lietotni (piemēram, pastu). Ja kaut kas nestrādā, lejupielādē PDF un pievieno to vēstulē pats.'
          },
          {
            q: 'Vai varu saglabāt PDF Google diskā?',
            a: 'Ja esi savienojis Google kontu iestatījumos, vari norādīt mapi un opciju kārtošanai pa mēnešiem. Tas palīdz automātiski sakārtot failus.'
          },
          {
            q: 'Kā saglabāt datus datorā?',
            a: 'Iestatījumi → Dati: «Eksportēt JSON» saglabā kopiju. «Importēt JSON» ielādē vecu kopiju atpakaļ — pirms tā labāk izveido jaunu eksportu, ja neesi pārliecināts.'
          }
        ]
      },
      {
        id: 'account',
        title: 'Konts un pieraksts',
        items: [
          {
            q: 'Google vai e-pasts — kāda starpība?',
            a: 'Google — viens klikšķis, dati nāk no Google konta. E-pasts un parole — tu reģistrējies Qlynton un pieraksties ar tiem pašiem datiem. Rēķini pieder tavam kontam abos gadījumos.'
          },
          {
            q: 'Vai varu mainīt e-pastu?',
            a: 'Nē — e-pasts ir tavs konta identifikators. Google kontā adrese tiek rādīta no Google; to maina Google, ne Qlynton.'
          },
          {
            q: 'Ko var mainīt konta sadaļā?',
            a: 'Parasti vari mainīt vārdu, kas tiek rādīts. Ja lieto paroli, ir iespēja pieprasīt paroles maiņu pa e-pastu. Google lietotāji paroli Qlynton nemaina — to pārvalda Google.'
          }
        ]
      }
    ],
    en: [
      {
        id: 'start',
        title: 'Start here — super simple',
        items: [
          {
            q: 'What is Qlynton?',
            a: 'Qlynton is an app for making invoices (bills) for your work. You can save them in one place, download a PDF, and see whether money is still owed or already paid.'
          },
          {
            q: 'What should I do first?',
            a: '1) In Settings, add your business and fill in bank details: bank (from the list or custom), SWIFT/BIC, IBAN — they show on the invoice PDF.\n2) Add a customer you send invoices to.\n3) Click “Create new invoice” and fill in the lines.'
          },
          {
            q: 'Where are the main buttons?',
            a: 'At the top: “My Invoices” is your list. “Create new invoice” makes a new one. The gear opens Settings (business, clients, language). The question mark opens this Help page. If you see a bank icon, it can open your online banking (when you set it up).'
          }
        ]
      },
      {
        id: 'invoices',
        title: 'Invoices',
        items: [
          {
            q: 'How do I create a new invoice?',
            a: 'Click “Create new invoice”. Pick your business and customer, set the date, and add lines (what you sold, how many, price). Save. Later you can download a PDF or use Share… from the row menu (⋯) to send the file.'
          },
          {
            q: 'How do I find an old invoice?',
            a: 'Open “My Invoices”. Use search, dates, customer, or status. There are quick filters like “This month”. “Clear filters” resets everything.'
          },
          {
            q: 'What do Draft, Sent, Overdue, and Paid mean?',
            a: 'Draft — not finished or not sent yet. Sent — you sent it to the customer. Overdue — the due date passed and it is not paid yet. Paid — the money arrived. You can change the status in the editor to match how you work.'
          },
          {
            q: 'How do I get a PDF?',
            a: 'Open the invoice and use the download. You get a file you can attach to email or print.'
          },
          {
            q: 'Can I email the invoice?',
            a: 'Open the ⋯ menu on the invoice row and choose Share… to hand the PDF to your system (for example Mail). If the attachment does not show up in your mail app, use Download PDF on the row and attach the file yourself.'
          }
        ]
      },
      {
        id: 'setup',
        title: 'Business, customers & services',
        items: [
          {
            q: 'How do I add my bank details?',
            a: 'Open Settings → Companies → Edit company. Pick your bank from the list (or type the name). Enter SWIFT/BIC and IBAN. If your bank is not listed, you can add an online banking URL. These details appear at the bottom of the invoice PDF.'
          },
          {
            q: 'Why add a business?',
            a: 'Your invoice shows your business name, address, bank, and other details. You can add more than one business and pick a default for new invoices.'
          },
          {
            q: 'What is a customer?',
            a: 'The person or company you bill. Saving their name, address, and email means you do not have to type it again.'
          },
          {
            q: 'What are services?',
            a: 'A list of common jobs and prices. You can drop them into an invoice as lines, or type anything by hand.'
          },
          {
            q: 'Why pick a bank from the list?',
            a: 'So the right bank name and account show on the invoice. If your bank is not listed, you can type it yourself and add an online banking link if you want.'
          }
        ]
      },
      {
        id: 'settings',
        title: 'Settings & extras',
        items: [
          {
            q: 'Where do I change language and dark mode?',
            a: 'Settings → Appearance & language: app language, invoice language (for PDF wording), and light or dark theme.'
          },
          {
            q: 'How does Share… work?',
            a: 'The browser opens the system share sheet so you can hand the PDF to another app (for example Mail). If the attachment does not appear in your mail app, download the PDF from the row and attach it manually.'
          },
          {
            q: 'Can I save PDFs to Google Drive?',
            a: 'If you connect Google in Settings, you can choose a folder and optional monthly subfolders so files stay organised.'
          },
          {
            q: 'How do I back up my data?',
            a: 'Settings → Data: “Export JSON” saves a backup file. “Import JSON” loads an old backup — export first if you are not sure.'
          }
        ]
      },
      {
        id: 'account',
        title: 'Account & sign-in',
        items: [
          {
            q: 'What is the difference between Google and email sign-in?',
            a: 'Google is one click and uses your Google name and email. Email & password means you signed up in Qlynton with that email. Your invoices belong to your account either way.'
          },
          {
            q: 'Can I change my email?',
            a: 'No — email is your account id. With Google, the address shown comes from Google and is managed there, not in Qlynton.'
          },
          {
            q: 'What can I change on the Account screen?',
            a: 'You can usually change the name shown. If you use a password, you can request a reset link. Google users do not use a Qlynton password — Google handles that.'
          }
        ]
      }
    ],
    ru: [
      {
        id: 'start',
        title: 'С чего начать — очень просто',
        items: [
          {
            q: 'Что такое Qlynton?',
            a: 'Это приложение для счетов на твою работу. Можно хранить всё в одном месте, скачать PDF и видеть: деньги ещё ждут или уже оплачены.'
          },
          {
            q: 'С чего начать?',
            a: '1) В настройках добавь компанию и укажи банковские реквизиты: банк (из списка или вручную), SWIFT/BIC, IBAN — они покажутся в PDF счёта.\n2) Добавь клиента, которому выставляешь счета.\n3) Нажми «Создать счёт» и заполни строки.'
          },
          {
            q: 'Где главные кнопки?',
            a: 'Вверху: «Мои счета» — список. «Создать счёт» — новый счёт. Шестерёнка — настройки (компания, клиенты, язык). Знак вопроса — эта справка. Иконка банка может открыть интернет-банк, если ты это настроил.'
          }
        ]
      },
      {
        id: 'invoices',
        title: 'Счета',
        items: [
          {
            q: 'Как создать новый счёт?',
            a: 'Нажми «Создать счёт». Выбери компанию и клиента, дату и строки (что продал, сколько, цена). Сохрани. Потом можно скачать PDF или поделиться им из списка (меню ⋯).'
          },
          {
            q: 'Как найти старый счёт?',
            a: 'Открой «Мои счета». Используй поиск, даты, клиента или статус. Есть быстрые фильтры, например «Этот месяц». «Сбросить фильтры» очищает всё.'
          },
          {
            q: 'Что значат черновик, отправлен, просрочен, оплачен?',
            a: 'Черновик — ещё не готов или не отправлен. Отправлен — уже у клиента. Просрочен — срок прошёл, денег нет. Оплачен — деньги получены. Статус можно менять в редакторе.'
          },
          {
            q: 'Как получить PDF?',
            a: 'Открой счёт и скачай PDF — файл можно вложить в письмо или распечатать.'
          },
          {
            q: 'Можно отправить счёт по почте?',
            a: 'В списке открой меню ⋯ у счёта и выбери «Поделиться…», чтобы передать PDF системе (например в почту). Если вложения нет, скачай PDF и прикрепи файл вручную.'
          }
        ]
      },
      {
        id: 'setup',
        title: 'Компания, клиенты и услуги',
        items: [
          {
            q: 'Как указать банковские реквизиты?',
            a: 'Открой Настройки → Компании → Редактировать компанию. Выбери банк из списка или введи название. Укажи SWIFT/BIC и IBAN. Если банка нет в списке, можно добавить ссылку на интернет-банк. Реквизиты отображаются внизу PDF счёта.'
          },
          {
            q: 'Зачем добавлять компанию?',
            a: 'На счёте видны название, адрес, банк и реквизиты. Можно добавить несколько компаний и выбрать одну по умолчанию для новых счетов.'
          },
          {
            q: 'Кто такой клиент?',
            a: 'Тот, кому выставляешь счёт. Сохрани имя, адрес и почту — не придётся вводить снова.'
          },
          {
            q: 'Что такое услуги?',
            a: 'Список частых работ и цен. Их можно быстро вставить в счёт строками, но можно писать и вручную.'
          },
          {
            q: 'Зачем выбирать банк из списка?',
            a: 'Чтобы на счёте было правильное название банка и счёт. Если банка нет в списке, можно ввести вручную и при желании добавить ссылку на интернет-банк.'
          }
        ]
      },
      {
        id: 'settings',
        title: 'Настройки и дополнительно',
        items: [
          {
            q: 'Где сменить язык и тёмную тему?',
            a: 'Настройки → Оформление и язык: язык приложения, язык текста в счётах (PDF) и светлая или тёмная тема.'
          },
          {
            q: 'Как работает «Поделиться…»?',
            a: 'Браузер открывает системное окно «Поделиться» — можно передать PDF в другое приложение (например почту). Если вложения нет, скачай PDF в списке и прикрепи вручную.'
          },
          {
            q: 'Можно сохранять PDF в Google Диск?',
            a: 'Если подключить Google в настройках, можно выбрать папку и при желании раскладывать по месяцам.'
          },
          {
            q: 'Как сделать резервную копию?',
            a: 'Настройки → Данные: «Экспорт JSON» сохраняет файл. «Импорт JSON» загружает старую копию — перед этим лучше сделать новый экспорт, если не уверен.'
          }
        ]
      },
      {
        id: 'account',
        title: 'Аккаунт и вход',
        items: [
          {
            q: 'Чем Google отличается от email и пароля?',
            a: 'Google — вход в один клик, данные из Google. Email и пароль — регистрация в Qlynton и вход теми же данными. Счета в любом случае твои.'
          },
          {
            q: 'Можно сменить email?',
            a: 'Нет — email это идентификатор аккаунта. При входе через Google адрес берётся из Google и меняется там.'
          },
          {
            q: 'Что можно менять в разделе «Аккаунт»?',
            a: 'Обычно отображаемое имя. Для входа по паролю можно запросить ссылку сброса. У Google-пользователей пароль Qlynton не используется — его задаёт Google.'
          }
        ]
      }
    ]
  };
})(typeof window !== 'undefined' ? window : this);
