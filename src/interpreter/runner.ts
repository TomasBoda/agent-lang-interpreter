import { EMPTY, Observable, Subject, interval, of, startWith, switchMap, takeUntil } from "rxjs";

class Runner {

    private dataSubject: Subject<number> = new Subject();
    private stopSubject: Subject<boolean> = new Subject();

    private isPaused = false;
    private counter = 0;
  
    get(steps: number, delay: number): Observable<number> {
      return this.dataSubject.asObservable().pipe(
        startWith(null),
        takeUntil(this.stopSubject),
        switchMap(() => interval(delay).pipe(takeUntil(this.stopSubject))),
        takeUntil(this.stopSubject),
        switchMap(() => {
          if (!this.isPaused) {
            this.counter++;
            if (this.counter <= steps) {
              return of(this.counter);
            } else {
              this.stop();
              return EMPTY;
            }
          } else {
            return EMPTY;
          }
        })
      );
    }
  
    start() {
      this.stop();
      this.dataSubject.next(0);
    }
  
    stop() {
      this.isPaused = false;
      this.counter = 0;
      this.stopSubject.next(true);
    }
  
    pause() {
      this.isPaused = true;
    }
  
    resume() {
      this.isPaused = false;
    }
  
    step() {
      if (this.isPaused) {
        this.dataSubject.next(++this.counter);
      }
    }
  }