export class MidiService {
  private midiAccess: any = null;
  private onNoteOnCallback: ((midiNumber: number) => void) | null = null;
  private onConnectionChangeCallback: ((isConnected: boolean) => void) | null = null;
  private isInitializing: boolean = false;

  async initialize(
    onNoteOn: (midi: number) => void,
    onConnectionChange: (isConnected: boolean) => void
  ): Promise<void> {
    // Update callbacks immediately so they are fresh
    this.onNoteOnCallback = onNoteOn;
    this.onConnectionChangeCallback = onConnectionChange;

    // If we already have access, just ensure inputs are bound and status is updated
    if (this.midiAccess) {
      this.updateConnectionStatus();
      this.bindInputs();
      return;
    }

    if (this.isInitializing) return;
    this.isInitializing = true;

    if (!(navigator as any).requestMIDIAccess) {
      return;
    }

    try {
      this.midiAccess = await (navigator as any).requestMIDIAccess();
      
      this.updateConnectionStatus();
      this.bindInputs();

      // Handle hot-plugging
      this.midiAccess.onstatechange = (e: any) => {
        this.updateConnectionStatus();
        if (e.port.type === 'input' && e.port.state === 'connected') {
          this.bindInput(e.port);
        }
      };
    } catch (err) {
      console.error("MIDI Access failed", err);
    } finally {
      this.isInitializing = false;
    }
  }

  private bindInputs() {
    if (!this.midiAccess) return;
    const inputs = this.midiAccess.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
      this.bindInput(input.value);
    }
  }

  private bindInput(input: any) {
    // Re-binding is safe, it just replaces the handler
    input.onmidimessage = this.handleMidiMessage.bind(this);
  }

  private updateConnectionStatus() {
    if (!this.midiAccess) return;
    // Check if we have any input ports
    const hasInputs = this.midiAccess.inputs.size > 0;
    this.onConnectionChangeCallback?.(hasInputs);
  }

  private handleMidiMessage(event: any) {
    const [command, note, velocity] = event.data;
    
    // Command 144-159 is Note On (0x90-0x9F)
    const isNoteOn = (command & 0xF0) === 0x90;
    
    if (isNoteOn && velocity > 0) {
      if (this.onNoteOnCallback) {
        this.onNoteOnCallback(note);
      }
    }
  }
}