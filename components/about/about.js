/*
  Логика About: чат-блок появляется анимацией "пришло сообщение"
  (см. about-chat-in в about.css), когда блок впервые попадает во вьюпорт —
  а не сразу при загрузке страницы.
*/

const animatedChats = new WeakSet();

export function initAbout(root = document) {
  const chat = root.querySelector(".about-block__chat");
  if (!chat || animatedChats.has(chat)) return;

  animatedChats.add(chat);

  if (!("IntersectionObserver" in window)) {
    chat.classList.add("is-visible");
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        chat.classList.add("is-visible");
        observer.disconnect();
      });
    },
    { threshold: 0.4 }
  );

  observer.observe(chat);
}

// Автоинициализация при обычном подключении <script src="about.js" type="module">
initAbout(document);
