package at.foldedsoft.slideshowcast;

public abstract class AsyncReceiver<T> {
  public abstract void finished(T result);
}
