//@ts-check

namespace examples {
  namespace Annotation {
    declare let $$: any | Array<any> | (<T>($$: T) => T);

    declare interface $$<T = any> {
      constructor($$?: T);
    }
  }

  namespace Class {
    Declaration: class $$<T = any> {
      constructor($$?: T) {}
    }

    Expression: (class $$<T = any> {
      constructor($$?: T) {}
    });

    AnnotatedExpression: (class $$<T = any> {
      constructor($$?: T) {}
    } as typeof Annotation.$$);

    namespace Annotation {
      export declare class $$<T = any> {
        constructor($$?: T);
      }
    }
  }

  namespace Function {
    Declaration: function $$<T>($$: T): T {
      return $$;
    }

    Expression: (function $$<T>($$: T): T {
      return $$;
    });

    AnnotatedExpression: (function $$<T>($$: T): T {
      return $$;
    } as typeof Annotation.$$);

    namespace Annotation {
      export declare function $$<T>($$: T): T;
    }
  }

  namespace ArrowFunction {
    Expression: <T>($$: T) => {};

    AnnotatedExpression: (<T>($$: T) => {}) as typeof Annotation.$$;

    namespace Annotation {
      export declare let $$: <T>($$: T) => T;
    }
  }
}
