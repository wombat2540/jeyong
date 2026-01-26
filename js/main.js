document.addEventListener("DOMContentLoaded", () => {
    
    // =================================================================
    // 0. Preloader Logic (로딩 화면)
    // =================================================================
    const loader = document.getElementById('loader');
    const counter = document.getElementById('loader-count');
    const body = document.body;

    // 로딩 중 스크롤 방지
    body.classList.add('no-scroll');

    let count = 0;
    // 카운팅 속도 조절 (숫자가 클수록 느림)
    const interval = setInterval(() => {
        count++;
        counter.innerText = count;

        if (count === 100) {
            clearInterval(interval);
            
            // 1. 커튼 올리기
            loader.classList.add('loader-hidden');
            
            // 2. 스크롤 잠금 해제
            body.classList.remove('no-scroll');

            // 3. ✨ 타이밍 동기화: 커튼이 올라가는 도중에 글자 무너뜨리기
            // (500ms 뒤에 실행하여 시각적 쾌감 극대화)
            setTimeout(() => {
                startCollapse(); 
            }, 600); 
        }
    }, 16); // 0.025초마다 숫자 증가 (약 2.5초 소요)


    // =================================================================
    // 1. Matter.js 물리 엔진 (Falling Letters)
    // =================================================================
    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Composite = Matter.Composite,
          Mouse = Matter.Mouse,
          MouseConstraint = Matter.MouseConstraint,
          Events = Matter.Events,
          Body = Matter.Body;

    const engine = Engine.create();
    const world = engine.world;

    const container = document.getElementById('physics-container');
    let viewWidth = container.clientWidth; 
    let viewHeight = container.clientHeight;

    const render = Render.create({
        element: container,
        engine: engine,
        options: {
            width: viewWidth,
            height: viewHeight,
            background: 'transparent',
            wireframes: false,
            pixelRatio: window.devicePixelRatio
        }
    });
    render.canvas.style.touchAction = 'pan-y';

    // 벽 생성
    let ground, leftWall, rightWall, topWall;
function createWalls() {
        const wallOptions = { isStatic: true, render: { visible: false } };
        const wallThick = 200; // 벽 두께를 더 두껍게(200) 해서 뚫림 방지

        // 1. 바닥, 왼쪽, 오른쪽 벽
        ground = Bodies.rectangle(viewWidth / 2, viewHeight + wallThick / 2, viewWidth, wallThick, wallOptions);
        
        // 옆 벽은 키를 엄청 키워서(viewHeight * 10) 절대 못 넘어가게 함
        leftWall = Bodies.rectangle(0 - wallThick / 2, viewHeight / 2, wallThick, viewHeight * 10, wallOptions);
        rightWall = Bodies.rectangle(viewWidth + wallThick / 2, viewHeight / 2, wallThick, viewHeight * 10, wallOptions);

        const wallsToAdd = [ground, leftWall, rightWall];

        // 2. 📱 [핵심] 모바일일 때만 '천장(Top Wall)' 설치
        if (window.innerWidth <= 768) {
            // 화면 천장 (y=0) 바로 위에 설치
            // viewWidth를 넉넉하게 잡아서 빈틈없이 막음
            topWall = Bodies.rectangle(viewWidth / 2, -wallThick / 2, viewWidth * 2, wallThick, wallOptions);
            wallsToAdd.push(topWall);
        } else {
            topWall = null; // PC면 천장 없음
        }

        Composite.add(world, wallsToAdd);
    }
    createWalls();

    // 글자 생성 설정
    let letters = [];
    const word1 = "HELLO";
    const word2 = "I'M JJY";
    let fontSize = Math.min(viewWidth * 0.25, 450); 
    
    function createTextBodies() {
        letters = [];
        Composite.clear(world, false);
        Composite.add(world, [ground, leftWall, rightWall, mouseConstraint]);

        viewWidth = container.clientWidth;
        viewHeight = container.clientHeight;
        fontSize = Math.min(viewWidth * 0.25, 450);
        
        const spacing = fontSize * -0.01; 
        const charHeight = fontSize * 0.85;
        const lineGap = fontSize * 0.85; 
        const totalGroupHeight = (charHeight * 2) + (lineGap - charHeight); 
        const startY = (viewHeight - totalGroupHeight) / 2 + (charHeight / 2);

        createWordRowProportional(word1, startY, fontSize, spacing);
        createWordRowProportional(word2, startY + lineGap, fontSize, spacing);
    }

    function createWordRowProportional(word, y, size, gap) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `900 ${size}px "Oswald"`;

        const charData = word.split('').map(char => {
            const metrics = tempCtx.measureText(char);
            return { char: char, width: metrics.width * 0.95 }; 
        });

        const totalRowWidth = charData.reduce((acc, data) => acc + data.width, 0) + (word.length - 1) * gap;
        let currentX = (viewWidth - totalRowWidth) / 2;

        charData.forEach(data => {
            const centerX = currentX + (data.width / 2);
            const body = Bodies.rectangle(centerX, y, data.width, size * 0.8, {
                isStatic: true, // 처음엔 고정
                restitution: 0.8,
                friction: 0.5,
                render: { fillStyle: 'transparent' },
                label: data.char
            });

            body.initialPos = { x: centerX, y: y };
            body.initialAngle = 0;

            letters.push(body);
            Composite.add(world, body);
            currentX += data.width + gap;
        });
    }
    
    // 마우스 컨트롤
    const mouse = Mouse.create(render.canvas);
    mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
    mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: { stiffness: 0.2, render: { visible: false } }
    });
    Composite.add(world, mouseConstraint);
    render.mouse = mouse;

    // 렌더링
    Events.on(render, 'afterRender', function() {
        const ctx = render.context;
        ctx.font = `900 ${fontSize}px "Oswald"`;
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        letters.forEach(body => {
            ctx.save();
            ctx.translate(body.position.x, body.position.y);
            ctx.rotate(body.angle);
            ctx.fillText(body.label, 0, fontSize * 0.05); 
            ctx.restore();
        });
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    
// ✨ [최종] 모바일 전용: 우주 바람 + 화면 이탈 방지 강제 적용
    Events.on(engine, 'beforeUpdate', function() {
        const isMobile = window.innerWidth <= 768;
        
        // 모바일이고, 글자들이 무너진 상태일 때만 작동
        if (isMobile && letters.length > 0 && !letters[0].isStatic) {
            
            letters.forEach(body => {
                // 1. 🌬️ 우주 바람 (멈추지 않게 살짝 밀어줌)
                if (body.speed < 1) {
                    const forceMagnitude = 0.0005 * body.mass;
                    Body.applyForce(body, body.position, {
                        x: (Math.random() - 0.5) * forceMagnitude,
                        y: (Math.random() - 0.5) * forceMagnitude
                    });
                }

                // 2. 🚧 [핵심] 화면 밖으로 나가면 강제로 잡아오기 (물리 벽보다 강력함)
                
                // (1) 천장 뚫고 나갔을 때
                if (body.position.y < 0) {
                    Body.setPosition(body, { x: body.position.x, y: 10 }); // 화면 안으로 강제 이동
                    Body.setVelocity(body, { x: body.velocity.x, y: Math.abs(body.velocity.y) }); // 아래로 튕겨냄
                }

                // (2) 바닥 뚫고 나갔을 때
                if (body.position.y > viewHeight) {
                    Body.setPosition(body, { x: body.position.x, y: viewHeight - 10 });
                    Body.setVelocity(body, { x: body.velocity.x, y: -Math.abs(body.velocity.y) }); // 위로 튕겨냄
                }

                // (3) 왼쪽 벽 뚫고 나갔을 때
                if (body.position.x < 0) {
                    Body.setPosition(body, { x: 10, y: body.position.y });
                    Body.setVelocity(body, { x: Math.abs(body.velocity.x), y: body.velocity.y }); // 오른쪽으로 튕겨냄
                }

                // (4) 오른쪽 벽 뚫고 나갔을 때
                if (body.position.x > viewWidth) {
                    Body.setPosition(body, { x: viewWidth - 10, y: body.position.y });
                    Body.setVelocity(body, { x: -Math.abs(body.velocity.x), y: body.velocity.y }); // 왼쪽으로 튕겨냄
                }
            });
        }
    });
    createTextBodies();

// 💥 무너짐 효과 함수 (PC: 중력 / Mobile: 무중력 완전탄성)
    function startCollapse() {
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // 📱 [Mobile] 무중력 우주 모드
            engine.world.gravity.y = 0;
            engine.world.gravity.x = 0;
            
            letters.forEach(body => {
                Body.setStatic(body, false);
                
                // ✨ 핵심 1: 공기 저항을 0으로 (멈추지 않음)
                body.frictionAir = 0; 
                body.friction = 0; // 마찰력 제거

                // ✨ 핵심 2: 탄성을 1로 (벽에 닿으면 100% 힘으로 튕겨나감)
                body.restitution = 1.0; 

                // 초기 추진력 (처음에만 툭 밀어줌)
                Body.setVelocity(body, { 
                    x: (Math.random() - 0.5) * 5, // 속도 적당히
                    y: (Math.random() - 0.5) * 5 
                });
                
                // 천천히 회전하면서 유영
                Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
            });

        } else {
            // 💻 [PC] 일반 중력 모드
            engine.world.gravity.y = 1; 
            
            letters.forEach(body => {
                Body.setStatic(body, false);
                body.frictionAir = 0.01; // 공기 저항 있음
                body.restitution = 0.5;  // 적당히 튀어오름
                
                Body.setVelocity(body, { 
                    x: (Math.random() - 0.5) * 5, 
                    y: (Math.random() - 0.5) * 5 
                });
            });
        }
    }

    // 리셋 버튼
    const resetBtn = document.getElementById('reset-btn');
    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
            letters.forEach(body => {
                Body.setVelocity(body, { x: 0, y: 0 });
                Body.setAngularVelocity(body, 0);
                Body.setPosition(body, body.initialPos);
                Body.setAngle(body, body.initialAngle);
                Body.setStatic(body, true);
            });
            // 리셋 시에는 1초 뒤에 다시 무너지게
            setTimeout(startCollapse, 1000);
        });
    }

// 리사이즈 대응
window.addEventListener('resize', () => {
        viewWidth = container.clientWidth;
        viewHeight = container.clientHeight;
        render.canvas.width = viewWidth;
        render.canvas.height = viewHeight;
        render.canvas.style.touchAction = 'pan-y';

        // 기존 벽 제거 (천장이 있으면 천장도 같이 제거)
        const wallsToRemove = [ground, leftWall, rightWall];
        if (topWall) wallsToRemove.push(topWall); 
        Composite.remove(world, wallsToRemove);

        // 벽 다시 만들기 (여기서 위쪽 createWalls가 실행되면서 천장이 생김)
        createWalls();
        createTextBodies();

        // 중력 설정 업데이트
        if (window.innerWidth <= 768) {
            engine.world.gravity.y = 0;
            engine.world.gravity.x = 0;
        } else {
            engine.world.gravity.y = 1;
            engine.world.gravity.x = 0;
        }
    });


    // =================================================================
    // 2. 네비게이션 진행바 (Progress Bar)
    // =================================================================
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;

        sections.forEach((section, index) => {
            const link = navLinks[index];
            const progressBar = link.querySelector('.nav-progress');
            if (!progressBar) return;

            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollY + windowHeight > sectionTop && scrollY < sectionTop + sectionHeight) {
                let progress = (scrollY - sectionTop) / (sectionHeight - windowHeight);
                if (sectionHeight <= windowHeight) progress = 1;
                progress = Math.max(0, Math.min(1, progress));
                
                link.classList.add('active');
                progressBar.style.width = `${progress * 100}%`;
            } else {
                link.classList.remove('active');
                progressBar.style.width = '0%';
            }
        });
    });


    // =================================================================
    // 3. 프로필 섹션: 타자기 효과
    // =================================================================
    const profileSection = document.getElementById('profile'); 
    if (profileSection) {
        const typeTargets = profileSection.querySelectorAll(
            'h2, h3, p, li, span, strong, b, .resume-item strong, .resume-item span'
        );

        const originalTexts = [];
        typeTargets.forEach(el => {
            if(el.children.length === 0 && el.innerText.trim() !== "") {
                originalTexts.push({
                    element: el,
                    text: el.innerText
                });
                el.innerText = ""; 
                el.style.visibility = "visible"; 
            }
        });

        const typeWriter = (item) => {
            const element = item.element;
            const text = item.text;
            let i = 0;
            element.classList.add('typing-cursor'); 
            const speed = Math.floor(Math.random() * 20) + 50; 

            const typing = setInterval(() => {
                element.textContent += text.charAt(i);
                i++;
                if (i >= text.length) {
                    clearInterval(typing);
                    element.classList.remove('typing-cursor');
                }
            }, speed);
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    observer.unobserve(entry.target);
                    originalTexts.forEach(item => typeWriter(item));
                }
            });
        }, { threshold: 0.15 }); 

        observer.observe(profileSection);
    }
});

// =================================================================
    // 4. 모바일 스크롤 완전 해결 (이름표 확인 방식)
    // =================================================================
    
    // 1. CSS 터치 액션 강제 적용
    render.canvas.style.touchAction = "pan-y";

    const Query = Matter.Query;
    const Composite = Matter.Composite;

    // 2. 터치 이벤트 가로채기 (Capture Phase)
    render.canvas.addEventListener('touchstart', (event) => {
        const touch = event.touches[0];
        const rect = render.canvas.getBoundingClientRect();
        
        // 터치 좌표
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // 현재 월드에 있는 '모든' 물체 가져오기 (벽, 바닥, 글자 전부)
        const allBodies = Composite.allBodies(engine.world);
        
        // 내 손가락 위치에 있는 물체 찾기
        const hitBodies = Query.point(allBodies, { x: x, y: y });
        
        // 💥 핵심 판독기: "잡은 게 글자인가?"
        // 글자는 라벨이 "J", "E" 처럼 1글자입니다. 벽은 "Rectangle Body"로 깁니다.
        const isTouchingLetter = hitBodies.some(body => body.label.length === 1);

        // 글자를 잡은 게 아니라면? (허공이나 벽을 잡았다면)
        if (!isTouchingLetter) {
            // 물리 엔진이 눈치채지 못하게 이벤트를 차단 -> 브라우저가 스크롤함
            event.stopImmediatePropagation();
        }

    }, { capture: true });
